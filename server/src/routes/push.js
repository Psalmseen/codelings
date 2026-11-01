import { Router } from 'express';
import PushSubscription from '../models/PushSubscription.js';
import { requireAuth } from '../middleware/auth.js';
import { sendPush, vapidKeys } from '../services/push.js';
import { HttpError } from '../utils/httpError.js';
import { pushSubscriptionInput } from '../utils/schemas.js';

const router = Router();
router.use(requireAuth);

// The browser needs this to create a subscription for this server
router.get('/public-key', async (_req, res) => {
  res.json({ publicKey: (await vapidKeys()).publicKey });
});

router.post('/subscribe', async (req, res) => {
  const { endpoint, keys } = pushSubscriptionInput.parse(req.body);
  // A device belongs to whoever subscribed it last (e.g. a shared family phone)
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { user: req.user._id, keys, userAgent: (req.get('user-agent') ?? '').slice(0, 300) },
    { upsert: true }
  );
  res.status(201).json({ ok: true });
});

router.post('/unsubscribe', async (req, res) => {
  const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : null;
  if (endpoint) await PushSubscription.deleteOne({ endpoint, user: req.user._id });
  res.json({ ok: true });
});

router.post('/test', async (req, res) => {
  const delivered = await sendPush(req.user._id, {
    title: 'Codelings notifications are on 🔔',
    body: req.user.role === 'admin' ? "You'll hear about new applications here." : "We'll nudge you when your streak is at risk.",
    url: req.user.role === 'admin' ? '/admin' : '/learn',
    tag: 'test',
  });
  if (!delivered) throw new HttpError(404, 'No device is set up for notifications yet. Turn them on first.');
  res.json({ delivered });
});

export default router;
