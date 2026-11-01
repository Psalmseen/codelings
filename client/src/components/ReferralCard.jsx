import { Copy, Gift, MessageCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';

/** A student's personal referral code and link, plus who has joined through it. */
export default function ReferralCard() {
  const toast = useToast();
  const { data } = useFetch('/learn/referrals');
  if (!data?.code) return null;

  const link = `${window.location.origin}/apply?ref=${data.code}`;
  const message = `I'm learning to code on Codelings 🐛 and it's actually fun! Apply with my referral link: ${link}`;
  const copy = async (text, what) => {
    await navigator.clipboard.writeText(text);
    toast(`${what} copied`);
  };

  return (
    <section className="card space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-lime-400/15 text-lime-300 light:text-lime-700">
          <Gift className="size-6" />
        </span>
        <div>
          <h2 className="text-xl font-black text-ink">Invite friends</h2>
          <p className="text-sm font-semibold text-ink-muted">Learning is more fun together. Share your code or link.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => copy(data.code, 'Code')}
          className="cursor-pointer rounded-2xl border-2 border-dashed border-neon-400/60 bg-neon-500/10 px-4 py-2 font-mono text-lg font-black tracking-wider text-ink"
          title="Copy your code"
        >
          {data.code}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => copy(link, 'Link')}>
          <Copy className="size-4" /> Copy link
        </button>
        <a className="btn btn-sm bg-[#25D366] text-white shadow-[0_4px_0_#1a9e4b] active:shadow-none" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
          <MessageCircle className="size-4" /> Share
        </a>
      </div>

      <p className="text-sm font-semibold text-ink-2">
        {data.joined.length ? (
          <>
            <b className="text-ink">{data.joined.length}</b> friend{data.joined.length === 1 ? ' has' : 's have'} joined: {data.joined.map((f) => f.name).join(', ')}
          </>
        ) : (
          'No friends have joined yet.'
        )}
        {data.pending > 0 && ` ${data.pending} application${data.pending === 1 ? ' is' : 's are'} waiting for approval.`}
      </p>
    </section>
  );
}
