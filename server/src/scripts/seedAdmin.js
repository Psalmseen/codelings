// Creates the admin account from ADMIN_* in .env (or resets its password if it exists).
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { env } from '../config/env.js';
import User from '../models/User.js';

if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env first');
  process.exit(1);
}

await connectDb();
const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
const existing = await User.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });

if (existing) {
  existing.set({ role: 'admin', passwordHash });
  await existing.save();
  console.log(`Updated admin ${existing.email}`);
} else {
  await User.create({ name: env.ADMIN_NAME, email: env.ADMIN_EMAIL, passwordHash, role: 'admin' });
  console.log(`Created admin ${env.ADMIN_EMAIL}`);
}

await mongoose.disconnect();
