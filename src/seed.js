import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import env from './config/env.js';
import { disconnectDB } from './config/db.js';
import User from './models/User.js';
import Category from './models/Category.js';
import Product from './models/Product.js';
import Setting from './models/Setting.js';

const DEFAULT_CATEGORIES = [
  'Soft Drinks',
  'Water',
  'Malt',
  'Juice',
  'Energy Drinks',
  'Other Beverages',
];

const SAMPLE_PRODUCTS = [
  { name: 'Coca-Cola 50cl', brand: 'Coca-Cola', category: 'Soft Drinks', sellingUnit: 'bottle', price: 500, costPrice: 400, stock: 120, minStock: 12 },
  { name: 'Coca-Cola Crate', brand: 'Coca-Cola', category: 'Soft Drinks', sellingUnit: 'crate', price: 12000, costPrice: 10500, stock: 20, minStock: 3 },
  { name: 'Pepsi 50cl', brand: 'Pepsi', category: 'Soft Drinks', sellingUnit: 'bottle', price: 500, costPrice: 400, stock: 90, minStock: 12 },
  { name: 'Bigi Pear 50cl', brand: 'Bigi', category: 'Juice', sellingUnit: 'bottle', price: 450, costPrice: 350, stock: 60, minStock: 10 },
  { name: 'Eva Water 75cl', brand: 'Eva', category: 'Water', sellingUnit: 'bottle', price: 300, costPrice: 220, stock: 200, minStock: 24 },
  { name: 'Maltina 33cl', brand: 'Maltina', category: 'Malt', sellingUnit: 'can', price: 600, costPrice: 480, stock: 80, minStock: 12 },
  { name: 'Fearless 50cl', brand: 'Fearless', category: 'Energy Drinks', sellingUnit: 'bottle', price: 800, costPrice: 650, stock: 48, minStock: 8 },
  { name: 'Club Beer 60cl', brand: 'Club', category: 'Other Beverages', sellingUnit: 'bottle', price: 700, costPrice: 560, stock: 72, minStock: 12 },
];

async function seed() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected to MongoDB, seeding...');

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@depot.local').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'change-me';
  const adminName = process.env.ADMIN_NAME || 'Shop Admin';

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) {
    console.log(`Admin already exists: ${adminEmail}`);
  } else {
    await User.create({
      name: adminName,
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: 'admin',
    });
    console.log(`Created admin: ${adminEmail} / ${adminPassword}`);
  }

  await Setting.get();
  console.log('Default settings ready');

  for (const name of DEFAULT_CATEGORIES) {
    await Category.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
  }
  console.log(`Categories ready (${DEFAULT_CATEGORIES.length})`);

  if (process.argv.includes('--products')) {
    const categories = await Category.find();
    const byName = new Map(categories.map((c) => [c.name, c._id]));
    let created = 0;
    for (const p of SAMPLE_PRODUCTS) {
      const { category, ...rest } = p;
      const res = await Product.updateOne(
        { name: p.name },
        { $setOnInsert: { ...rest, category: byName.get(category) } },
        { upsert: true }
      );
      if (res.upsertedCount) created += 1;
    }
    console.log(`Sample products created: ${created}`);
  }

  await disconnectDB();
  console.log('Seed complete');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
