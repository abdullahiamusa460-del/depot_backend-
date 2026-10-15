import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },
    shopName: { type: String, default: 'My Beverage Depot' },
    logoUrl: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    currency: { type: String, default: 'NGN' },
    currencySymbol: { type: String, default: '₦' },
    invoicePrefix: { type: String, default: 'INV' },
    defaultPaymentMethod: { type: String, default: 'cash' },
    paymentMethods: { type: [String], default: ['cash', 'bank_transfer', 'pos', 'other'] },
    receiptFooter: { type: String, default: 'Thank you for your purchase!' },
    lowStockDefault: { type: Number, default: 5, min: 0 },
    taxPercent: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

settingSchema.statics.get = async function get() {
  let doc = await this.findOne({ key: 'global' });
  if (!doc) doc = await this.create({ key: 'global' });
  return doc;
};

export default mongoose.model('Setting', settingSchema);
