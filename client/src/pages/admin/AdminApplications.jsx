import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { BarChart3, Check, Copy, Gift, Link2, Mail, MessageCircle, Phone, X } from 'lucide-react';
import { EmptyState, ErrorState, PageHeader, PageLoader, Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../lib/api';
import { formatDate, formatDay, timeAgo } from '../../lib/format';

const LABELS = {
  gender: { female: 'Female', male: 'Male', other: 'Other', prefer_not: 'Prefers not to say' },
  experience: { none: 'No coding yet', a_little: 'A little coding', some: 'Some coding' },
  hasLaptop: { yes: 'Has a laptop', shared: 'Shares a laptop', no: 'Phone only' },
  preferredTime: { morning: 'Mornings', afternoon: 'Afternoons', evening: 'Evenings', weekends: 'Weekends' },
};

const age = (dob) => Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
/** WhatsApp link straight to the number when it's in international format; otherwise pick a contact. */
const whatsappUrl = (phone, text) => {
  const digits = phone?.startsWith('+') ? phone.replace(/\D/g, '') : '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
};

function CopyButton({ text, label = 'Copy' }) {
  const toast = useToast();
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        toast('Copied');
      }}
    >
      <Copy className="size-4" /> {label}
    </button>
  );
}

function ShareCard() {
  const link = `${window.location.origin}/apply`;
  const message = `Want to learn to code? 🐛 Apply to join my Codelings class here: ${link}`;
  return (
    <section className="card mb-6 flex flex-wrap items-center gap-4">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-neon-500/20 text-neon-300 light:text-neon-600">
        <Link2 className="size-6" />
      </span>
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-black text-ink">Your apply link</p>
        <p className="truncate font-mono text-sm text-ink-muted">{link}</p>
      </div>
      <div className="flex gap-2">
        <CopyButton text={link} />
        <a className="btn btn-sm bg-[#25D366] text-white shadow-[0_4px_0_#1a9e4b] active:shadow-none" href={whatsappUrl('', message)} target="_blank" rel="noreferrer">
          <MessageCircle className="size-4" /> WhatsApp
        </a>
      </div>
    </section>
  );
}

function Details({ application: a }) {
  const facts = [
    a.dateOfBirth && `${age(a.dateOfBirth)} years old (born ${formatDay(a.dateOfBirth)})`,
    LABELS.gender[a.gender],
    [a.city, a.country].filter(Boolean).join(', '),
    a.occupation,
    LABELS.experience[a.experience],
    LABELS.hasLaptop[a.hasLaptop],
    LABELS.preferredTime[a.preferredTime] && `Prefers ${LABELS.preferredTime[a.preferredTime].toLowerCase()}`,
  ].filter(Boolean);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-ink-2">
        <a href={`mailto:${a.email}`} className="flex items-center gap-1 hover:text-ink">
          <Mail className="size-4 text-ink-faint" /> {a.email}
        </a>
        <a href={`tel:${a.phone}`} className="flex items-center gap-1 hover:text-ink">
          <Phone className="size-4 text-ink-faint" /> {a.phone}
        </a>
      </div>
      {facts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {facts.map((fact) => (
            <span key={fact} className="badge bg-tint/10 py-1 text-ink-2">
              {fact}
            </span>
          ))}
        </div>
      )}
      {a.goals && <p className="rounded-xl bg-tint/5 px-3 py-2 text-sm font-semibold text-ink-2">🎯 “{a.goals}”</p>}
    </div>
  );
}

function ApprovedResult({ result }) {
  const message = `Hi ${result.student.name.split(' ')[0]}! 🎉 Your Codelings application is approved.\n\nSign in at ${window.location.origin}/login\nEmail: ${result.student.email}\nTemporary password: ${result.tempPassword}\n\nYou'll choose your own password when you sign in.`;
  return (
    <div className="space-y-3 rounded-2xl border border-lime-400/40 bg-lime-400/10 p-4">
      <p className="flex items-center gap-2 font-black text-lime-300 light:text-lime-700">
        <Check className="size-5" /> Approved.{' '}
        {result.emailSent ? 'Login details emailed.' : `${result.emailError ?? 'Email not sent'}: send the details yourself.`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-ink-muted">Temporary password:</span>
        <code className="rounded-lg bg-black/30 px-2 py-1 font-mono text-sm font-bold text-ink light:bg-white">{result.tempPassword}</code>
        <CopyButton text={message} label="Copy message" />
        <a className="btn btn-sm bg-[#25D366] text-white shadow-[0_4px_0_#1a9e4b] active:shadow-none" href={whatsappUrl(result.student.phone, message)} target="_blank" rel="noreferrer">
          <MessageCircle className="size-4" /> WhatsApp
        </a>
      </div>
      <p className="text-xs font-semibold text-ink-faint">The temporary password is only shown now. They must change it at first sign-in.</p>
    </div>
  );
}

function ReviewPanel({ application, courses, onDone }) {
  const toast = useToast();
  const [courseIds, setCourseIds] = useState([]);
  const [cohortByCourse, setCohortByCourse] = useState({});
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(null);

  const toggle = (id) => setCourseIds((ids) => (ids.includes(id) ? ids.filter((c) => c !== id) : [...ids, id]));

  async function approve() {
    setBusy('approve');
    try {
      const cohortIds = courseIds.map((id) => cohortByCourse[id]).filter(Boolean);
      const result = await api(`/admin/applications/${application._id}/approve`, { method: 'POST', body: { courseIds, cohortIds } });
      onDone({ approved: result });
    } catch (err) {
      toast(err.message, 'error');
      setBusy(null);
    }
  }

  async function reject() {
    setBusy('reject');
    try {
      const result = await api(`/admin/applications/${application._id}/reject`, { method: 'POST', body: { note } });
      toast(result.emailSent ? `${application.name} has been told by email` : 'Application rejected');
      onDone({ rejected: true });
    } catch (err) {
      toast(err.message, 'error');
      setBusy(null);
    }
  }

  if (rejecting) {
    return (
      <div className="space-y-2 rounded-2xl bg-tint/5 p-4">
        <label className="label" htmlFor={`note-${application._id}`}>Note for the applicant (optional, included in the email)</label>
        <textarea id={`note-${application._id}`} className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Classes are full this month, please apply again in January." />
        <div className="flex gap-2">
          <button className="btn btn-danger btn-sm" disabled={busy} onClick={reject}>
            {busy === 'reject' ? <Spinner className="size-4" /> : <X className="size-4" />} Reject and email
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setRejecting(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl bg-tint/5 p-4">
      <p className="text-sm font-extrabold text-ink-2">Enrol in</p>
      {courses.length === 0 ? (
        <p className="text-sm font-bold text-ink-faint">No courses yet. You can enrol them later from Students.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {courses.map((course) => (
            <button
              type="button"
              key={course._id}
              onClick={() => toggle(course._id)}
              className={`cursor-pointer rounded-2xl border-2 px-3 py-1.5 text-sm font-extrabold transition ${
                courseIds.includes(course._id) ? 'border-neon-400 bg-neon-500/10 text-neon-200 light:text-neon-700' : 'border-tint/10 text-ink-muted hover:bg-tint/5'
              }`}
            >
              {course.emoji} {course.title}
              {course.status === 'draft' && <span className="ml-1 text-ink-faint">(draft)</span>}
            </button>
          ))}
        </div>
      )}
      {courses
        .filter((c) => courseIds.includes(c._id) && c.cohorts.length > 0)
        .map((course) => (
          <select
            key={course._id}
            className="input py-2"
            value={cohortByCourse[course._id] ?? ''}
            onChange={(e) => setCohortByCourse({ ...cohortByCourse, [course._id]: e.target.value })}
            aria-label={`Cohort for ${course.title}`}
          >
            <option value="">{course.title}: no cohort (self-paced)</option>
            {course.cohorts.map((cohort) => (
              <option key={cohort._id} value={cohort._id}>
                {course.title}: {cohort.name} (starts {new Date(cohort.startDate).toLocaleDateString()})
              </option>
            ))}
          </select>
        ))}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={approve}>
          {busy === 'approve' ? <Spinner className="size-4" /> : <Check className="size-4" />} Approve and send login
        </button>
        <button className="btn btn-ghost btn-sm text-heart-500" onClick={() => setRejecting(true)}>
          Reject…
        </button>
      </div>
    </div>
  );
}

function ApplicationCard({ application: a, courses, onReviewed }) {
  const [approved, setApproved] = useState(null);
  return (
    <article className="card space-y-4">
      <header className="flex flex-wrap items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-neon-500 to-plasma-500 font-black text-white">
          {a.name[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-black text-ink">{a.name}</p>
          <p className="text-sm font-semibold text-ink-muted">Applied {timeAgo(a.createdAt)}</p>
        </div>
        {a.referredBy && (
          <span className="badge bg-lime-400/15 py-1 text-lime-300 light:text-lime-700">
            <Gift className="size-3.5" /> Referred by {a.referredBy.name}
          </span>
        )}
        {a.status !== 'pending' && (
          <span className={`badge py-1 ${a.status === 'approved' ? 'bg-lime-400/15 text-lime-300 light:text-lime-700' : 'bg-red-500/15 text-red-300 light:text-red-700'}`}>
            {a.status === 'approved' ? 'Approved' : 'Rejected'} {a.reviewedAt && formatDate(a.reviewedAt)}
          </span>
        )}
      </header>

      <Details application={a} />

      {a.status === 'pending' &&
        (approved ? <ApprovedResult result={approved} /> : <ReviewPanel application={a} courses={courses} onDone={(r) => (r.approved ? setApproved(r.approved) : onReviewed())} />)}
      {a.status === 'rejected' && a.rejectionNote && <p className="text-sm font-semibold text-ink-muted">Note sent: “{a.rejectionNote}”</p>}
      {a.status === 'approved' && a.user && (
        <Link to={`/admin/students/${a.user}`} className="btn btn-secondary btn-sm">
          <BarChart3 className="size-4" /> View student
        </Link>
      )}
    </article>
  );
}

export default function AdminApplications() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'pending';
  const { data, loading, error, reload } = useFetch(`/admin/applications?status=${status}`);
  const courses = useFetch('/admin/courses');

  return (
    <>
      <PageHeader title="Applications" subtitle="Share your apply link. Approve students to send them their login." />
      <ShareCard />

      <div className="mb-4 flex gap-1 rounded-2xl border border-tint/10 bg-tint/5 p-1">
        {['pending', 'approved', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setParams(s === 'pending' ? {} : { status: s })}
            className={`flex-1 cursor-pointer rounded-xl px-3 py-2 text-sm font-extrabold capitalize transition ${
              status === s ? 'bg-linear-to-r from-neon-500 to-plasma-500 text-white' : 'text-ink-muted hover:bg-tint/10 hover:text-ink'
            }`}
          >
            {s} {data?.counts?.[s] ? `(${data.counts[s]})` : ''}
          </button>
        ))}
      </div>

      {loading && !data && <PageLoader />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data?.applications.length === 0 && (
        <EmptyState title={status === 'pending' ? 'No applications waiting' : `No ${status} applications`}>
          {status === 'pending' && <p className="font-semibold text-ink-muted">Share your apply link above, and new applications will show up here.</p>}
        </EmptyState>
      )}
      <div className="space-y-4">
        {data?.applications.map((application) => (
          <ApplicationCard key={application._id} application={application} courses={courses.data?.courses ?? []} onReviewed={reload} />
        ))}
      </div>
    </>
  );
}
