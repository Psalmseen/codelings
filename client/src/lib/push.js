import { api } from './api';

// Web push: free notifications on Android, desktop, and iPhone (iOS 16.4+, once added to the home screen).

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

function base64UrlToBytes(value) {
  const padded = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

const sameKey = (a, b) => a && b && a.byteLength === b.byteLength && new Uint8Array(a).every((byte, i) => byte === b[i]);

export async function currentSubscription() {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/** Asks permission (if needed), subscribes this device and tells the server. */
export async function enablePush() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(permission === 'denied' ? 'Notifications are blocked. Allow them for this site in your browser settings.' : 'Notifications were not allowed');
  }
  const { publicKey } = await api('/push/public-key');
  const key = base64UrlToBytes(publicKey);
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  // A subscription made for a different server key can't be reused
  if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  await api('/push/subscribe', { method: 'POST', body: subscription.toJSON() });
  return subscription;
}

export async function disablePush() {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await api('/push/unsubscribe', { method: 'POST', body: { endpoint: subscription.endpoint } }).catch(() => {});
  await subscription.unsubscribe();
}

/** After sign-in, links this device's existing subscription to whoever is signed in now. */
export async function resyncPush() {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  const subscription = await currentSubscription();
  if (subscription) await api('/push/subscribe', { method: 'POST', body: subscription.toJSON() }).catch(() => {});
}
