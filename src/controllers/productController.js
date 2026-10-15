import Product from '../models/Product.js';
import Setting from '../models/Setting.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { buildPagination, pagedResult } from '../utils/pagination.js';
import { productSearchFilter } from '../utils/search.js';

const ALLOWED_SORTS = new Set([
  'name',
  '-name',
  'price',
  '-price',
  'stock',
  '-stock',
  'createdAt',
  '-createdAt',
]);

export const listProducts = asyncHandler(async (req, res) => {
  const { search, category, status, stockStatus, sort } = req.query;
  const { page, limit, skip } = buildPagination(req.query);

  const filter = {};
  if (search) Object.assign(filter, productSearchFilter(search));
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (stockStatus === 'out_of_stock') filter.stock = { $lte: 0 };
  if (stockStatus === 'low_stock') filter.$expr = { $lte: ['$stock', '$minStock'] };
  if (stockStatus === 'ok') filter.$expr = { $gt: ['$stock', '$minStock'] };

  const sortBy = ALLOWED_SORTS.has(sort) ? sort : 'name';

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name')
      .sort(sortBy)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({ success: true, data: pagedResult(items, total, page, limit) });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name');
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ success: true, data: product });
});

export const createProduct = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (data.sku === '') delete data.sku;
  if (data.barcode === '') delete data.barcode;

  if (!data.minStock && data.minStock !== 0) {
    const settings = await Setting.get();
    data.minStock = settings.lowStockDefault;
  }

  const product = await Product.create(data);
  res.status(201).json({ success: true, data: product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (data.sku === '') data.sku = null;
  if (data.barcode === '') data.barcode = null;

  const product = await Product.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true,
  });
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ success: true, data: product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ success: true, message: 'Product deleted' });
});
