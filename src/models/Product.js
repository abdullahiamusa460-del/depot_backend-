import mongoose from 'mongoose';

export const SELLING_UNITS = [
  'bottle',
  'can',
  'piece',
  'pack',
  'crate',
  'carton',
  'case',
  'other',
];

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, default: '', trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    description: { type: String, default: '', trim: true },
    sku: { type: String, unique: true, sparse: true, trim: true },
    barcode: { type: String, unique: true, sparse: true, trim: true },
    imageUrl: { type: String, default: '', trim: true },
    sellingUnit: { type: String, enum: SELLING_UNITS, default: 'bottle' },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    minStock: { type: Number, default: 5, min: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

productSchema.index({ name: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ stock: 1 });

productSchema.virtual('stockStatus').get(function stockStatus() {
  if (this.stock <= 0) return 'out_of_stock';
  if (this.stock <= this.minStock) return 'low_stock';
  return 'ok';
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

export default mongoose.model('Product', productSchema);
