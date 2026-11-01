import crypto from 'node:crypto';
import User from '../models/User.js';

// No look-alike characters (0/O, 1/l/I), so codes and passwords are easy to read out or type
const READABLE = 'abcdefghjkmnpqrstuvwxyz23456789';
const READABLE_MIXED = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

const randomFrom = (alphabet, length) => Array.from({ length }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');

/** One-time password emailed on approval; the student must change it at first sign-in. */
export const generateTempPassword = () => randomFrom(READABLE_MIXED, 10);

/** Short personal code like "tolu7k2f", unique across users. */
export async function generateReferralCode(name) {
  const base = (name.toLowerCase().match(/[a-z]+/)?.[0] ?? 'friend').slice(0, 6);
  for (let i = 0; i < 10; i++) {
    const code = `${base}${randomFrom(READABLE, 4)}`;
    if (!(await User.exists({ referralCode: code }))) return code;
  }
  return `${base}${randomFrom(READABLE, 8)}`;
}

/** Gives students created before referrals existed a code. Returns true if it changed the user. */
export async function ensureReferralCode(user) {
  if (user.role !== 'student' || user.referralCode) return false;
  user.referralCode = await generateReferralCode(user.name);
  return true;
}

export const findReferrer = (code) => (code ? User.findOne({ referralCode: code.trim().toLowerCase(), role: 'student' }) : null);
