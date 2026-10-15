import { z } from 'zod';
import { SELLING_UNITS } from '../models/Product.js';
import { STOCK_TRANSACTION_TYPES } from '../models/InventoryTransaction.js';
import { PAYMENT_METHODS } from '../models/Sale.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const optionalString = z.string().trim().optional().default('');

export const idParam = z.object({ id: objectId });

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// ---------- Auth ----------
export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  role: z.enum(['admin', 'staff']).optional().default('staff'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(72),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  role: z.enum(['admin', 'staff']).optional(),
  active: z.boolean().optional(),
});

// ---------- Categories ----------
export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(80),
  description: optionalString,
  active: z.boolean().optional().default(true),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

// ---------- Products ----------
export const productCreateSchema = z.object({
  name: z.string().min(1).max(120),
  brand: optionalString,
  category: objectId,
  description: optionalString,
  sku: optionalString,
  barcode: optionalString,
  imageUrl: optionalString,
  sellingUnit: z.enum(SELLING_UNITS).optional().default('bottle'),
  price: z.number().min(0),
  costPrice: z.number().min(0).optional().default(0),
  stock: z.number().int().min(0).optional().default(0),
  minStock: z.number().int().min(0).optional().default(5),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const productUpdateSchema = productCreateSchema.partial();

export const productListQuery = z.object({
  search: z.string().trim().optional(),
  category: objectId.optional(),
  status: z.enum(['active', 'inactive']).optional(),
  stockStatus: z.enum(['ok', 'low_stock', 'out_of_stock']).optional(),
  sort: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// ---------- Inventory ----------
export const stockAdjustSchema = z.object({
  product: objectId,
  type: z.enum(STOCK_TRANSACTION_TYPES),
  quantityChange: z.number().int().refine((v) => v !== 0, 'quantityChange cannot be zero'),
  reason: optionalString,
});

export const inventoryListQuery = z.object({
  search: z.string().trim().optional(),
  category: objectId.optional(),
  stockStatus: z.enum(['ok', 'low_stock', 'out_of_stock']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const transactionListQuery = z.object({
  product: objectId.optional(),
  type: z.enum(STOCK_TRANSACTION_TYPES).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// ---------- Sales ----------
export const saleItemSchema = z.object({
  product: objectId,
  quantity: z.number().int().min(1).max(100000),
  discount: z.number().min(0).optional().default(0),
});

export const saleCreateSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'A sale must have at least one item').max(200),
  discount: z.number().min(0).optional().default(0),
  amountPaid: z.number().min(0),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  customer: z
    .object({
      name: optionalString,
      phone: optionalString,
    })
    .optional()
    .default({ name: '', phone: '' }),
  note: optionalString,
});

export const saleListQuery = z.object({
  search: z.string().trim().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// ---------- Reports ----------
export const dateRangeQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

// ---------- Settings ----------
export const settingsUpdateSchema = z.object({
  shopName: z.string().min(1).max(120).optional(),
  logoUrl: z.string().optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional().or(z.literal('')),
  currency: z.string().max(10).optional(),
  currencySymbol: z.string().max(5).optional(),
  invoicePrefix: z
    .string()
    .min(1)
    .max(12)
    .regex(/^[A-Za-z0-9_-]+$/, 'Prefix must be alphanumeric')
    .optional(),
  defaultPaymentMethod: z.enum(PAYMENT_METHODS).optional(),
  paymentMethods: z.array(z.enum(PAYMENT_METHODS)).min(1).optional(),
  receiptFooter: z.string().max(300).optional(),
  lowStockDefault: z.number().int().min(0).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
});
