import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import Counter from '../models/Counter.js';
import Setting from '../models/Setting.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { buildPagination, pagedResult } from '../utils/pagination.js';
import { parseDateRange, rangeFilter } from '../utils/dates.js';

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

async function nextInvoiceNumber(prefix) {
  const seq = await Counter.next(`invoice:${prefix}`);
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

async function restockAll(reservations) {
  for (const r of reservations) {
    await Product.updateOne({ _id: r.productId }, { $inc: { stock: r.quantity } });
  }
}

export const createSale = asyncHandler(async (req, res) => {
  const { items, discount, amountPaid, paymentMethod, customer, note } = req.body;

  const settings = await Setting.get();
  const method = paymentMethod || settings.defaultPaymentMethod;
  if (!settings.paymentMethods.includes(method)) {
    throw ApiError.badRequest(
      `Payment method "${method}" is not enabled. Enabled: ${settings.paymentMethods.join(', ')}`
    );
  }

  // 1. Load and validate all products up front (for pricing + clear errors)
  const productIds = [...new Set(items.map((i) => i.product))];
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const missing = productIds.filter((id) => !productMap.has(id));
  if (missing.length) {
    throw ApiError.badRequest('Some products no longer exist', { missing });
  }
  const inactive = items
    .map((i) => productMap.get(i.product))
    .filter((p) => p.status !== 'active')
    .map((p) => p.name);
  if (inactive.length) {
    throw ApiError.badRequest(`Inactive product(s) cannot be sold: ${inactive.join(', ')}`);
  }

  // 2. Atomically reserve stock for each line (prevents overselling under concurrency)
  const reservations = [];
  const lineDetails = [];
  try {
    for (const item of items) {
      const product = productMap.get(item.product);

      const reserved = await Product.findOneAndUpdate(
        { _id: product._id, status: 'active', stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: false }
      );

      if (!reserved) {
        const current = await Product.findById(product._id);
        throw ApiError.badRequest(
          `Insufficient stock for "${product.name}". Available: ${current ? current.stock : 0}, requested: ${item.quantity}`
        );
      }

      reservations.push({ productId: product._id, quantity: item.quantity });

      const unitPrice = reserved.price;
      const lineSubtotal = round2(unitPrice * item.quantity - (item.discount || 0));
      if (lineSubtotal < 0) {
        throw ApiError.badRequest(`Discount for "${product.name}" exceeds line total`);
      }

      lineDetails.push({
        product: product._id,
        name: reserved.name,
        brand: reserved.brand,
        sku: reserved.sku || '',
        sellingUnit: reserved.sellingUnit,
        unitPrice,
        costPrice: reserved.costPrice,
        quantity: item.quantity,
        discount: item.discount || 0,
        subtotal: lineSubtotal,
        stockBefore: reserved.stock,
      });
    }

    // 3. Totals
    const subtotal = round2(lineDetails.reduce((sum, l) => sum + l.subtotal, 0));
    const saleDiscount = discount || 0;
    const total = round2(Math.max(0, subtotal - saleDiscount));

    // 4. Payment validation
    if (amountPaid < total) {
      throw ApiError.badRequest(
        `Amount paid (₦${amountPaid}) is less than the total (₦${total})`
      );
    }
    const change = round2(amountPaid - total);

    // 5. Invoice number (atomic counter — never duplicates)
    const invoiceNumber = await nextInvoiceNumber(settings.invoicePrefix);

    // 6. Persist sale
    const sale = await Sale.create({
      invoiceNumber,
      items: lineDetails.map(({ stockBefore, ...item }) => item),
      subtotal,
      discount: saleDiscount,
      total,
      amountPaid,
      change,
      paymentMethod: method,
      customer: customer || { name: '', phone: '' },
      note: note || '',
      staff: req.user._id,
    });

    // 7. Stock history (performed after reservation, using known before-values)
    await InventoryTransaction.create(
      lineDetails.map((l) => ({
        product: l.product,
        type: 'sale',
        previousQuantity: l.stockBefore,
        quantityChange: -l.quantity,
        newQuantity: l.stockBefore - l.quantity,
        reason: `Sale ${invoiceNumber}`,
        sale: sale._id,
        user: req.user._id,
      }))
    );

    res.status(201).json({ success: true, data: sale });
  } catch (err) {
    // Compensate: never leave stock reserved for a failed sale
    if (reservations.length) await restockAll(reservations);
    throw err;
  }
});

export const listSales = asyncHandler(async (req, res) => {
  const { search, paymentMethod } = req.query;
  const { from, to } = parseDateRange(req.query);
  const { page, limit, skip } = buildPagination(req.query);

  const filter = { ...rangeFilter(from, to) };
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (search) {
    filter.$or = [
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { 'customer.phone': { $regex: search, $options: 'i' } },
      { 'customer.name': { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Sale.find(filter)
      .populate('staff', 'name')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    Sale.countDocuments(filter),
  ]);

  res.json({ success: true, data: pagedResult(items, total, page, limit) });
});

export const getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id).populate('staff', 'name');
  if (!sale) throw ApiError.notFound('Sale not found');
  res.json({ success: true, data: sale });
});

export const getSaleByInvoice = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({
    invoiceNumber: req.params.invoiceNumber.toUpperCase(),
  }).populate('staff', 'name');
  if (!sale) throw ApiError.notFound('Sale not found');
  res.json({ success: true, data: sale });
});
