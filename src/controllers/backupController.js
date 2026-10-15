import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Sale from '../models/Sale.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import Setting from '../models/Setting.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const exportBackup = asyncHandler(async (req, res) => {
  const [categories, products, sales, inventoryTransactions, settings] =
    await Promise.all([
      Category.find().lean(),
      Product.find().lean(),
      Sale.find().lean(),
      InventoryTransaction.find().lean(),
      Setting.get().then((s) => s.toObject()),
    ]);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="depot-backup-${new Date().toISOString().slice(0, 10)}.json"`
  );
  res.json({
    success: true,
    data: {
      app: 'depot-backend',
      version: 1,
      exportedAt: new Date().toISOString(),
      categories,
      products,
      sales,
      inventoryTransactions,
      settings,
    },
  });
});

export const restoreBackup = asyncHandler(async (req, res) => {
  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    throw ApiError.badRequest('Backup payload must contain a "data" object');
  }
  if (data.app !== 'depot-backend' || data.version !== 1) {
    throw ApiError.badRequest('Unrecognized or unsupported backup file');
  }

  const { categories = [], products = [], sales = [], inventoryTransactions = [] } = data;
  if (!Array.isArray(categories) || !Array.isArray(products) || !Array.isArray(sales)) {
    throw ApiError.badRequest('Backup collections must be arrays');
  }

  async function runRestore(session) {
    const opts = session ? { session } : {};
    await InventoryTransaction.deleteMany({}, opts);
    await Sale.deleteMany({}, opts);
    await Product.deleteMany({}, opts);
    await Category.deleteMany({}, opts);

    if (categories.length) await Category.insertMany(categories, opts);
    if (products.length) await Product.insertMany(products, opts);
    if (sales.length) await Sale.insertMany(sales, opts);
    if (inventoryTransactions.length) {
      await InventoryTransaction.insertMany(inventoryTransactions, opts);
    }
  }

  // Transactions need a replica set; fall back to sequential restore on standalone
  let usedTransaction = true;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    await runRestore(session);
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    if (err.code === 20 || /Transaction numbers/i.test(err.message || '')) {
      usedTransaction = false;
      await runRestore(null);
    } else {
      throw err;
    }
  } finally {
    session.endSession();
  }

  res.json({
    success: true,
    message: usedTransaction
      ? 'Backup restored'
      : 'Backup restored (sequential mode — enable a replica set for transactional restores)',
    data: {
      categories: categories.length,
      products: products.length,
      sales: sales.length,
      inventoryTransactions: inventoryTransactions.length,
    },
  });
});
