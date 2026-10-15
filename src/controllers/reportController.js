import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import asyncHandler from '../utils/asyncHandler.js';
import { parseDateRange, rangeFilter } from '../utils/dates.js';

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export const salesReport = asyncHandler(async (req, res) => {
  const { from, to } = parseDateRange(req.query);
  const filter = rangeFilter(from, to);

  const [agg] = await Sale.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$total' },
        transactions: { $sum: 1 },
        cost: {
          $sum: {
            $sum: {
              $map: {
                input: '$items',
                as: 'i',
                in: { $multiply: ['$$i.costPrice', '$$i.quantity'] },
              },
            },
          },
        },
      },
    },
  ]);

  const result = agg || { revenue: 0, transactions: 0, cost: 0 };
  res.json({
    success: true,
    data: {
      from,
      to,
      revenue: round2(result.revenue),
      estimatedCost: round2(result.cost),
      estimatedProfit: result.revenue > 0 ? round2(result.revenue - result.cost) : null,
      transactions: result.transactions,
      averageSale:
        result.transactions > 0 ? round2(result.revenue / result.transactions) : 0,
    },
  });
});

export const dailySalesReport = asyncHandler(async (req, res) => {
  const { from, to } = parseDateRange(req.query);
  const filter = rangeFilter(from, to);

  const daily = await Sale.aggregate([
    { $match: filter },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$total' },
        transactions: { $sum: 1 },
        cost: {
          $sum: {
            $sum: {
              $map: {
                input: '$items',
                as: 'i',
                in: { $multiply: ['$$i.costPrice', '$$i.quantity'] },
              },
            },
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    data: daily.map((d) => ({
      date: d._id,
      revenue: round2(d.revenue),
      estimatedProfit: round2(d.revenue - d.cost),
      transactions: d.transactions,
    })),
  });
});

export const bestSellingProducts = asyncHandler(async (req, res) => {
  const { from, to } = parseDateRange(req.query);
  const filter = rangeFilter(from, to);
  const limit = Math.min(50, Number.parseInt(req.query.limit, 10) || 10);

  const products = await Sale.aggregate([
    { $match: filter },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' },
        transactions: { $sum: 1 },
      },
    },
    { $sort: { quantity: -1 } },
    { $limit: limit },
  ]);

  res.json({ success: true, data: products });
});

export const slowMovingProducts = asyncHandler(async (req, res) => {
  const days = Math.min(365, Number.parseInt(req.query.days, 10) || 30);
  const limit = Math.min(50, Number.parseInt(req.query.limit, 10) || 20);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const sold = await Sale.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.product', quantity: { $sum: '$items.quantity' } } },
  ]);
  const soldMap = new Map(sold.map((s) => [s._id.toString(), s.quantity]));

  const products = await Product.find({ status: 'active' }).limit(500).lean();
  const slow = products
    .map((p) => ({
      product: p._id,
      name: p.name,
      stock: p.stock,
      soldInPeriod: soldMap.get(p._id.toString()) || 0,
    }))
    .sort((a, b) => a.soldInPeriod - b.soldInPeriod || b.stock - a.stock)
    .slice(0, limit);

  res.json({ success: true, data: slow });
});

export const paymentReport = asyncHandler(async (req, res) => {
  const { from, to } = parseDateRange(req.query);
  const filter = rangeFilter(from, to);

  const payments = await Sale.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$paymentMethod',
        total: { $sum: '$total' },
        count: { $sum: 1 },
        changeGiven: { $sum: '$change' },
      },
    },
    { $sort: { total: -1 } },
  ]);

  res.json({ success: true, data: payments });
});

export const inventoryReport = asyncHandler(async (req, res) => {
  const [summary, lowStock, outOfStock] = await Promise.all([
    Product.aggregate([
      {
        $group: {
          _id: null,
          products: { $sum: 1 },
          units: { $sum: '$stock' },
          costValue: { $sum: { $multiply: ['$costPrice', '$stock'] } },
          retailValue: { $sum: { $multiply: ['$price', '$stock'] } },
        },
      },
    ]),
    Product.find({ $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$minStock'] }] } })
      .populate('category', 'name')
      .sort('stock name'),
    Product.find({ stock: { $lte: 0 } }).populate('category', 'name').sort('name'),
  ]);

  const s = summary[0] || { products: 0, units: 0, costValue: 0, retailValue: 0 };
  res.json({
    success: true,
    data: {
      summary: {
        products: s.products,
        unitsInStock: s.units,
        costValue: round2(s.costValue),
        retailValue: round2(s.retailValue),
      },
      lowStock,
      outOfStock,
    },
  });
});
