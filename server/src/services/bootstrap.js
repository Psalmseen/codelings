import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import User from '../models/User.js';

/** On a fresh database, creates the admin from ADMIN_* settings. Never changes an existing admin. */
export async function ensureAdmin() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return;
  if (await User.exists({ role: 'admin' })) return;
  await User.create({
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL,
    passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, 10),
    role: 'admin',
  });
  console.log(`Created admin account ${env.ADMIN_EMAIL}`);
}
