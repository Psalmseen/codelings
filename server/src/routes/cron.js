import crypto from 'node:crypto';
import { Router } from 'express';
import { env } from '../config/env.js';
import { runScheduledJobs } from '../services/jobs.js';

const router = Router();

function sameSecret(given) {
  const a = Buffer.from(given);
  const b = Buffer.from(env.CRON_SECRET);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function validKey(given) {
  if (!env.CRON_SECRET || typeof given !== 'string') return false;
  // An unencoded "+" in a URL arrives as a space, so also accept the key with spaces restored to "+"
  return sameSecret(given.trim()) || sameSecret(given.trim().replace(/ /g, '+'));
}

// For an external scheduler (e.g. cron-job.org) on hosts that sleep when idle:
// calling this wakes the server and runs any due jobs. Key via ?key= or the X-Cron-Key header.
router.all('/run', async (req, res) => {
  if (!validKey(req.get('x-cron-key') ?? req.query.key)) return res.status(401).json({ error: 'Invalid cron key' });
  const { sent } = await runScheduledJobs();
  res.json({ ok: true, remindersSent: sent });
});

export default router;
