import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import asyncHandler from '../utils/asyncHandler.js';
import { startOfDay, endOfDay } from '../utils/dates.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  const todayMatch = { createdAt: { $gte: todayStart, $lte: todayEnd } };

  const [
    todayAgg,
    totalProducts,
    lowStock,
    outOfStock,
    inventoryValue,
    recentSales,
    bestSellers,
    paymentSummary,
    trend,
  ] = await Promise.all([
    Sale.aggregate([
      { $match: todayMatch },
      {
        $group: {
          _id: null,
          sales: { $sum: '$total' },
          transactions: { $sum: 1 },
          revenue: { $sum: '$total' },
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
    ]),
    Product.countDocuments(),
    Product.countDocuments({ $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$minStock'] }] } }),
    Product.countDocuments({ stock: { $lte: 0 } }),
    Product.aggregate([
      { $group: { _id: null, value: { $sum: { $multiply: ['$costPrice', '$stock'] } } } },
    ]),
    Sale.find().sort('-createdAt').limit(8).populate('staff', 'name'),
    Sale.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]),
    Sale.aggregate([
      { $group: { _id: '$paymentMethod', total: { $sum: '$total' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          sales: { $sum: '$total' },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const today = todayAgg[0] || { sales: 0, transactions: 0, revenue: 0, cost: 0 };
  const profit = today.revenue > 0 ? today.revenue - today.cost : null;

  res.json({
    success: true,
    data: {
      today: {
        sales: today.sales,
        transactions: today.transactions,
        estimatedProfit: profit,
      },
      products: {
        total: totalProducts,
        lowStock: lowStock,
        outOfStock: outOfStock,
      },
      inventoryValue: inventoryValue[0]?.value || 0,
      recentSales,
      bestSellers,
      paymentSummary,
      salesTrend: trend,
    },
  });
});
