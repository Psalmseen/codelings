import { useState } from 'react';
import { BellRing } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { enablePush } from '../lib/push';
import { useNotifications } from './NotificationsSetting';
import { Spinner } from './ui';

const DISMISS_KEY = 'codelings_push_prompt_dismissed';

/** Home-page nudge to turn on streak reminders, until the student answers it. */
export default function NotificationPrompt() {
  const toast = useToast();
  const [state, setState] = useNotifications();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  const [busy, setBusy] = useState(false);

  const askable = state === 'off' && Notification.permission === 'default';
  if (dismissed || !(askable || state === 'ios-install')) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  async function turnOn() {
    setBusy(true);
    try {
      await enablePush();
      setState('on');
      toast("Reminders are on. We'll nudge you before your streak ends 🔥");
    } catch (err) {
      toast(err.message, 'error');
      dismiss();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card flex flex-wrap items-center gap-4 border-neon-400/40">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-neon-500/20 text-neon-300 light:text-neon-600">
        <BellRing className="size-6" />
      </span>
      <div className="min-w-0 flex-1 basis-48">
        <p className="font-black text-ink">Never lose your streak</p>
        <p className="text-sm font-semibold text-ink-muted">
          {state === 'ios-install'
            ? 'On iPhone, tap Share → “Add to Home Screen”, then open Codelings from there to get reminders.'
            : 'Get a reminder on this phone when your streak is about to end.'}
        </p>
      </div>
      {/* On phones the buttons get their own row so the text isn't squeezed */}
      <div className="flex w-full gap-2 sm:w-auto">
        {askable && (
          <button className="btn btn-primary btn-sm flex-1 sm:flex-none" onClick={turnOn} disabled={busy}>
            {busy ? <Spinner className="size-4" /> : 'Turn on'}
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={dismiss}>
          Not now
        </button>
      </div>
    </section>
  );
}
