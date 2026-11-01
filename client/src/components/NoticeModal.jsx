import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { tierOf } from '../lib/leagues';
import Mascot from './Mascot';
import { Modal, Spinner } from './ui';

function describe(notice) {
  const { type, data } = notice;
  if (type === 'freeze_used') {
    return {
      icon: '🧊',
      title: 'Streak freeze used!',
      body: `You missed ${data.used === 1 ? 'a day' : `${data.used} days`}, but your ${data.streak}-day streak is safe. Do a lesson today to keep it going!`,
    };
  }
  if (type === 'league_result') {
    const to = tierOf(data.toTier);
    if (data.result === 'promoted') {
      return { icon: to.emoji, title: `Promoted to ${to.name} League!`, body: `You finished #${data.rank} last week. Amazing work!`, celebrate: true };
    }
    if (data.result === 'demoted') {
      return { icon: to.emoji, title: `Moved to ${to.name} League`, body: `You finished #${data.rank} last week. Earn more XP this week to climb back up!`, mood: 'sad' };
    }
    return { icon: to.emoji, title: `You stayed in ${to.name} League`, body: `You finished #${data.rank} last week. Push for the top spots this week!` };
  }
  return null;
}

/** Shows the student's oldest unread notice (freeze used, league result) one at a time. */
export default function NoticeModal() {
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const notice = user.notices?.find(describe);
  const info = notice && describe(notice);

  useEffect(() => {
    if (info?.celebrate) confetti({ particleCount: 150, spread: 90, origin: { y: 0.4 }, colors: ['#2F6BFF', '#FF2BD6', '#5CF2FF', '#FFFFFF'] });
  }, [notice?._id, info?.celebrate]);

  if (!info) return null;

  async function dismiss() {
    setBusy(true);
    try {
      const { user: updated } = await api(`/learn/notices/${notice._id}/dismiss`, { method: 'POST' });
      setUser(updated);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="" onClose={dismiss}>
      <div className="flex flex-col items-center gap-3 pb-2 text-center">
        <div className="relative">
          <Mascot size={110} mood={info.mood ?? 'excited'} />
          <span className="absolute -right-3 -bottom-1 text-5xl">{info.icon}</span>
        </div>
        <h2 className="text-2xl font-black">{info.title}</h2>
        <p className="font-semibold text-slate-400">{info.body}</p>
        <button className="btn btn-primary mt-2 w-full" onClick={dismiss} disabled={busy} autoFocus>
          {busy ? <Spinner /> : 'Got it'}
        </button>
      </div>
    </Modal>
  );
}
