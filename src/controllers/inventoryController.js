import Product from '../models/Product.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { buildPagination, pagedResult } from '../utils/pagination.js';
import { parseDateRange, rangeFilter } from '../utils/dates.js';
import { productSearchFilter } from '../utils/search.js';

const SIGN_FOR_TYPE = {
  received: 1,
  return: 1,
  damaged: -1,
  expired: -1,
  adjustment: null, // any non-zero
  correction: null,
  sale: -1,
};

export const listInventory = asyncHandler(async (req, res) => {
  const { search, category, stockStatus } = req.query;
  const { page, limit, skip } = buildPagination(req.query);

  const filter = {};
  if (search) Object.assign(filter, productSearchFilter(search));
  if (category) filter.category = category;
  if (stockStatus === 'out_of_stock') filter.stock = { $lte: 0 };
  if (stockStatus === 'low_stock') filter.$expr = { $lte: ['$stock', '$minStock'] };
  if (stockStatus === 'ok') filter.$expr = { $gt: ['$stock', '$minStock'] };

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name')
      .sort('stock name')
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({ success: true, data: pagedResult(items, total, page, limit) });
});

export const adjustStock = asyncHandler(async (req, res) => {
  const { product: productId, type, quantityChange, reason } = req.body;

  const expectedSign = SIGN_FOR_TYPE[type];
  if (expectedSign === 1 && quantityChange < 0) {
    throw ApiError.badRequest(`Type "${type}" requires a positive quantityChange`);
  }
  if (expectedSign === -1 && quantityChange > 0) {
    throw ApiError.badRequest(`Type "${type}" requires a negative quantityChange`);
  }

  const decrementing = quantityChange < 0;
  const filter = { _id: productId };
  if (decrementing) filter.stock = { $gte: Math.abs(quantityChange) };

  // Atomic decrement-or-fail: guarantees stock never goes negative
  const previous = await Product.findOneAndUpdate(
    filter,
    { $inc: { stock: quantityChange } },
    { new: false }
  );

  if (!previous) {
    const product = await Product.findById(productId);
    if (!product) throw ApiError.notFound('Product not found');
    throw ApiError.badRequest(
      `Insufficient stock for "${product.name}". Available: ${product.stock}, requested change: ${quantityChange}`
    );
  }

  const txn = await InventoryTransaction.create({
    product: productId,
    type,
    previousQuantity: previous.stock,
    quantityChange,
    newQuantity: previous.stock + quantityChange,
    reason,
    user: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: {
      transaction: txn,
      newQuantity: previous.stock + quantityChange,
    },
  });
});

export const listTransactions = asyncHandler(async (req, res) => {
  const { product, type } = req.query;
  const { from, to } = parseDateRange(req.query);
  const { page, limit, skip } = buildPagination(req.query);

  const filter = { ...rangeFilter(from, to) };
  if (product) filter.product = product;
  if (type) filter.type = type;

  const [items, total] = await Promise.all([
    InventoryTransaction.find(filter)
      .populate('product', 'name brand sellingUnit')
      .populate('user', 'name')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    InventoryTransaction.countDocuments(filter),
  ]);

  res.json({ success: true, data: pagedResult(items, total, page, limit) });
});
