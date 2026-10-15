import mongoose from 'mongoose';

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'pos', 'other'];

const saleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    brand: { type: String, default: '' },
    sku: { type: String, default: '' },
    sellingUnit: { type: String, default: 'piece' },
    unitPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    discount: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    items: {
      type: [saleItemSchema],
      validate: [(v) => v.length > 0, 'A sale must have at least one item'],
    },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, required: true, min: 0 },
    change: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'cash' },
    customer: {
      name: { type: String, default: '', trim: true },
      phone: { type: String, default: '', trim: true },
    },
    note: { type: String, default: '', trim: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

saleSchema.index({ createdAt: -1 });
saleSchema.index({ paymentMethod: 1, createdAt: -1 });
saleSchema.index({ 'customer.phone': 1 });

export default mongoose.model('Sale', saleSchema);
