import { useState } from 'react';
import { Link } from 'react-router';
import { BellRing, Copy, Mail, MessageCircle, PartyPopper } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../lib/api';
import { firstName, percent } from '../../lib/format';
import NotificationsSetting from '../NotificationsSetting';
import { ErrorState, Spinner } from '../ui';

function nudgeMessage(student) {
  const link = `${window.location.origin}/learn/courses/${student.course._id}`;
  const name = firstName(student.name);
  if (student.neverStarted) {
    return `Hi ${name}! 👋 Your ${student.course.title} course on Codelings is ready and waiting. The first lesson only takes a few minutes. Jump in here: ${link}`;
  }
  return `Hi ${name}! 👋 It's been ${student.daysInactive} days since your last lesson in ${student.course.title}. You're ${percent(student.course.completed, student.course.total)}% through, so don't lose that progress! Pick up where you left off: ${link}`;
}

function NudgeButtons({ student }) {
  const toast = useToast();
  const message = nudgeMessage(student);
  const copy = async () => {
    await navigator.clipboard.writeText(message);
    toast('Message copied');
  };
  const mailto = `mailto:${student.email}?subject=${encodeURIComponent('We miss you on Codelings!')}&body=${encodeURIComponent(message)}`;

  return (
    <div className="flex gap-1">
      <a className="icon-btn text-[#25D366] hover:text-[#1a9e4b]" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" title="Send on WhatsApp">
        <MessageCircle className="size-5" />
      </a>
      <a className="icon-btn" href={mailto} title="Send an email">
        <Mail className="size-5" />
      </a>
      <button className="icon-btn" onClick={copy} title="Copy message">
        <Copy className="size-5" />
      </button>
    </div>
  );
}

/** Students who've gone quiet for 3+ days, with one-tap nudge messages. */
export function AtRiskList() {
  const { data, loading, error, reload } = useFetch('/admin/at-risk');

  return (
    <section className="card p-0">
      <header className="border-b-2 border-tint/5 px-5 py-4">
        <h2 className="text-lg font-black">Students who need a nudge</h2>
        <p className="text-sm font-bold text-ink-muted">No lesson in 3+ days (or never started) with a course still to finish.</p>
      </header>
      {loading && !data && (
        <div className="flex justify-center p-6">
          <Spinner />
        </div>
      )}
      {error && (
        <div className="p-4">
          <ErrorState error={error} onRetry={reload} />
        </div>
      )}
      {data?.students.length === 0 && (
        <p className="flex items-center gap-2 px-5 py-6 font-bold text-lime-400 light:text-lime-600">
          <PartyPopper className="size-5" /> Everyone's on track. Nobody needs a nudge right now!
        </p>
      )}
      <ul className="divide-y-2 divide-tint/5">
        {data?.students.map((student) => (
          <li key={student._id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-400/15 font-black text-orange-300 light:text-orange-700">
              {student.name[0]?.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <Link to={`/admin/students/${student._id}`} className="block truncate font-extrabold hover:text-neon-300 light:hover:text-neon-600">
                {student.name}
              </Link>
              <p className="truncate text-sm font-semibold text-ink-muted">
                {student.course.emoji} {student.course.title} · {student.course.completed}/{student.course.total} lessons
              </p>
            </div>
            <span className={`badge ${student.daysInactive >= 7 ? 'bg-red-500/15 text-heart-500' : 'bg-orange-400/15 text-orange-300 light:text-orange-700'}`}>
              {student.neverStarted ? `Not started (${student.daysInactive}d)` : `${student.daysInactive} days quiet`}
            </span>
            <NudgeButtons student={student} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RemindersCard() {
  const toast = useToast();
  const [sending, setSending] = useState(false);

  async function sendTest() {
    setSending(true);
    try {
      const { to } = await api('/admin/reminders/test', { method: 'POST' });
      toast(`Test reminder sent to ${to}`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="card flex flex-wrap items-center gap-4">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-flame-500/15 text-flame-500">
        <BellRing className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-black">Automatic streak reminders are on</p>
        <p className="text-sm font-semibold text-ink-muted">
          At 7pm in each student's timezone, anyone with a streak who hasn't practised that day gets an email and a phone notification (if they turned
          notifications on). Students control both in their profile.
        </p>
      </div>
      <button className="btn btn-secondary btn-sm" onClick={sendTest} disabled={sending}>
        {sending ? <Spinner className="size-4" /> : <Mail className="size-4" />} Send me a test email
      </button>
      <div className="w-full border-t border-tint/10 pt-4">
        <NotificationsSetting description="Get a notification on this device whenever someone applies" />
      </div>
    </section>
  );
}
