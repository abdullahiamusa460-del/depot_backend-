import mongoose from 'mongoose';

export const STOCK_TRANSACTION_TYPES = [
  'received',
  'sale',
  'return',
  'damaged',
  'expired',
  'adjustment',
  'correction',
];

const inventoryTransactionSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    type: { type: String, enum: STOCK_TRANSACTION_TYPES, required: true },
    previousQuantity: { type: Number, required: true, min: 0 },
    quantityChange: { type: Number, required: true },
    newQuantity: { type: Number, required: true, min: 0 },
    reason: { type: String, default: '', trim: true },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

inventoryTransactionSchema.index({ product: 1, createdAt: -1 });
inventoryTransactionSchema.index({ type: 1, createdAt: -1 });
inventoryTransactionSchema.index({ createdAt: -1 });

export default mongoose.model('InventoryTransaction', inventoryTransactionSchema);
