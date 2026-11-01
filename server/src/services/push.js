import webpush from 'web-push';
import { clientUrl, env } from '../config/env.js';
import PushSubscription from '../models/PushSubscription.js';
import Setting from '../models/Setting.js';

let vapid = null;

/**
 * The key pair that identifies this server to browser push services. Taken from env if set,
 * otherwise generated once and stored in the database, so it survives restarts and redeploys.
 */
export async function vapidKeys() {
  if (vapid) return vapid;
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    vapid = { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
  } else {
    const stored = await Setting.findOne({ key: 'vapid' });
    if (stored) vapid = stored.value;
    else {
      const generated = webpush.generateVAPIDKeys();
      // upsert so two instances starting together agree on one pair
      const saved = await Setting.findOneAndUpdate({ key: 'vapid' }, { $setOnInsert: { value: generated } }, { upsert: true, new: true });
      vapid = saved.value;
    }
  }
  webpush.setVapidDetails(env.VAPID_SUBJECT ?? `mailto:${env.ADMIN_EMAIL ?? 'admin@example.com'}`, vapid.publicKey, vapid.privateKey);
  return vapid;
}

/**
 * Sends a notification to every device a user turned notifications on for.
 * `url` is opened when the notification is tapped. Returns how many devices it reached.
 */
export async function sendPush(userId, { title, body, url = '/', tag }) {
  const subscriptions = await PushSubscription.find({ user: userId });
  if (!subscriptions.length) return 0;
  await vapidKeys();

  const payload = JSON.stringify({ title, body, url: url.startsWith('http') ? url : `${clientUrl}${url}`, tag });
  let delivered = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, { TTL: 6 * 60 * 60 });
        delivered += 1;
        await PushSubscription.updateOne({ _id: sub._id }, { lastSuccessAt: new Date() });
      } catch (err) {
        // 404/410: the browser dropped this subscription (app uninstalled, permission revoked)
        if (err.statusCode === 404 || err.statusCode === 410) await PushSubscription.deleteOne({ _id: sub._id });
        else console.error(`[push] sending to ${sub.endpoint.slice(0, 40)}… failed:`, err.statusCode ?? err.message);
      }
    })
  );
  return delivered;
}
