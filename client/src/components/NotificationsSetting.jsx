import { useEffect, useState } from 'react';
import { Bell, BellOff, Send, Smartphone } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { currentSubscription, disablePush, enablePush, isInstalled, isIos, pushSupported } from '../lib/push';
import { Spinner } from './ui';

/** Turns notifications on/off for this device, with a test button and iPhone instructions. */
export function useNotifications() {
  const [state, setState] = useState('loading'); // loading | unsupported | ios-install | blocked | off | on
  useEffect(() => {
    if (!pushSupported()) return setState(isIos() && !isInstalled() ? 'ios-install' : 'unsupported');
    if (Notification.permission === 'denied') return setState('blocked');
    currentSubscription().then((sub) => setState(sub && Notification.permission === 'granted' ? 'on' : 'off'));
  }, []);
  return [state, setState];
}

export default function NotificationsSetting({ description }) {
  const toast = useToast();
  const [state, setState] = useNotifications();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      if (state === 'on') {
        await disablePush();
        setState('off');
      } else {
        await enablePush();
        setState('on');
        toast('Notifications are on 🔔');
      }
    } catch (err) {
      if (Notification.permission === 'denied') setState('blocked');
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    try {
      await api('/push/test', { method: 'POST' });
      toast('Test sent. It should pop up in a moment');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span>
          <span className="block font-extrabold">Phone notifications</span>
          <span className="text-sm font-semibold text-ink-muted">{description}</span>
        </span>
        {(state === 'on' || state === 'off') && (
          <button className={`btn btn-sm shrink-0 ${state === 'on' ? 'btn-secondary' : 'btn-primary'}`} onClick={toggle} disabled={busy}>
            {busy ? <Spinner className="size-4" /> : state === 'on' ? <BellOff className="size-4" /> : <Bell className="size-4" />}
            {state === 'on' ? 'Turn off' : 'Turn on'}
          </button>
        )}
      </div>
      {state === 'on' && (
        <button className="btn btn-ghost btn-sm px-0 normal-case" onClick={test}>
          <Send className="size-4" /> Send me a test notification
        </button>
      )}
      {state === 'blocked' && (
        <p className="rounded-xl bg-orange-400/10 px-3 py-2 text-sm font-semibold text-orange-300 light:text-orange-700">
          Notifications are blocked for Codelings. Allow them in your browser's site settings, then reload.
        </p>
      )}
      {state === 'ios-install' && (
        <p className="flex gap-2 rounded-xl bg-neon-500/10 px-3 py-2 text-sm font-semibold text-ink-2">
          <Smartphone className="mt-0.5 size-4 shrink-0" />
          On iPhone, first add Codelings to your Home Screen: tap Share, then “Add to Home Screen”. Open it from there and turn notifications on.
        </p>
      )}
      {state === 'unsupported' && <p className="text-sm font-semibold text-ink-faint">This browser doesn't support notifications.</p>}
    </div>
  );
}
