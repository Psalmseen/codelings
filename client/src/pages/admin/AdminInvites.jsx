import { useState } from 'react';
import { Copy, MessageCircle, Trash2 } from 'lucide-react';
import { ConfirmButton, ErrorState, PageHeader, PageLoader, Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../lib/api';
import { timeAgo } from '../../lib/format';

const STATUS_STYLES = {
  pending: 'bg-orange-100 text-orange-600',
  used: 'bg-lime-100 text-lime-700',
  expired: 'bg-slate-100 text-slate-500',
};

const whatsappLink = (invite) =>
  `https://wa.me/?text=${encodeURIComponent(
    `Hi${invite.name ? ` ${invite.name}` : ''}! Here's your invite to learn coding on Codelings 🐛 ${invite.link}`
  )}`;

function ShareButtons({ invite }) {
  const toast = useToast();
  const copy = async () => {
    await navigator.clipboard.writeText(invite.link);
    toast('Link copied');
  };
  return (
    <div className="flex gap-2">
      <button className="btn btn-secondary btn-sm" onClick={copy}>
        <Copy className="size-4" /> Copy
      </button>
      <a className="btn btn-sm bg-[#25D366] text-white shadow-[0_4px_0_#1a9e4b] active:shadow-none" href={whatsappLink(invite)} target="_blank" rel="noreferrer">
        <MessageCircle className="size-4" /> WhatsApp
      </a>
    </div>
  );
}

function InviteForm({ courses, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', courseIds: [], cohortByCourse: {}, expiresInDays: 14, sendEmail: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggleCourse = (id) =>
    setForm((f) => ({ ...f, courseIds: f.courseIds.includes(id) ? f.courseIds.filter((c) => c !== id) : [...f.courseIds, id] }));

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { cohortByCourse, ...fields } = form;
      const cohortIds = form.courseIds.map((id) => cohortByCourse[id]).filter(Boolean);
      const result = await api('/admin/invites', { method: 'POST', body: { ...fields, cohortIds, sendEmail: form.sendEmail && Boolean(form.email) } });
      onCreated(result, form);
      setForm((f) => ({ ...f, name: '', email: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="invite-name">Student name (optional)</label>
          <input id="invite-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="invite-email">Email (optional)</label>
          <input
            id="invite-email"
            type="email"
            className="input"
            placeholder="Locks the invite to this email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
      </div>

      <div>
        <span className="label">Courses they get</span>
        {courses.length === 0 ? (
          <p className="text-sm font-bold text-slate-400">No courses yet. You can enrol them later from Students.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {courses.map((course) => {
              const selected = form.courseIds.includes(course._id);
              return (
                <button
                  type="button"
                  key={course._id}
                  onClick={() => toggleCourse(course._id)}
                  className={`cursor-pointer rounded-2xl border-2 px-3 py-2 text-sm font-extrabold transition ${
                    selected ? 'border-grape-400 bg-grape-50 text-grape-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {course.emoji} {course.title}
                  {course.status === 'draft' && <span className="ml-1 text-slate-400">(draft)</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {courses
        .filter((course) => form.courseIds.includes(course._id) && course.cohorts.length > 0)
        .map((course) => (
          <div key={course._id}>
            <label className="label" htmlFor={`cohort-${course._id}`}>
              Cohort for {course.emoji} {course.title}
            </label>
            <select
              id={`cohort-${course._id}`}
              className="input py-2.5"
              value={form.cohortByCourse[course._id] ?? ''}
              onChange={(e) => setForm({ ...form, cohortByCourse: { ...form.cohortByCourse, [course._id]: e.target.value } })}
            >
              <option value="">No cohort (self-paced)</option>
              {course.cohorts.map((cohort) => (
                <option key={cohort._id} value={cohort._id}>
                  {cohort.name} (starts {new Date(cohort.startDate).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        ))}

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 font-bold text-slate-600">
          Expires in
          <select className="input w-auto py-2" value={form.expiresInDays} onChange={(e) => setForm({ ...form, expiresInDays: Number(e.target.value) })}>
            {[3, 7, 14, 30, 90].map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
        </label>
        <label className={`flex items-center gap-2 font-bold ${form.email ? 'text-slate-600' : 'text-slate-300'}`}>
          <input
            type="checkbox"
            className="size-5 accent-grape-500"
            disabled={!form.email}
            checked={form.sendEmail && Boolean(form.email)}
            onChange={(e) => setForm({ ...form, sendEmail: e.target.checked })}
          />
          Email the invite
        </label>
      </div>

      {error && <p className="rounded-xl bg-heart-500/10 px-3 py-2 text-sm font-bold text-heart-500">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>
        {busy ? <Spinner /> : 'Create invite link'}
      </button>
    </form>
  );
}

export default function AdminInvites() {
  const toast = useToast();
  const invites = useFetch('/admin/invites');
  const courses = useFetch('/admin/courses');
  const [created, setCreated] = useState(null);

  function handleCreated(result, form) {
    setCreated(result);
    invites.reload();
    if (result.emailSent) toast(`Invite emailed to ${form.email}`);
    else if (result.emailError) toast(`${result.emailError}. Share the link instead.`, 'error');
  }

  async function remove(invite) {
    try {
      await api(`/admin/invites/${invite._id}`, { method: 'DELETE' });
      if (created?.invite._id === invite._id) setCreated(null);
      invites.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <>
      <PageHeader title="Invites" subtitle="Codelings is invite-only. Each link works for one student." />

      {courses.data ? <InviteForm courses={courses.data.courses} onCreated={handleCreated} /> : <PageLoader />}

      {created && (
        <div className="card mt-4 border-lime-300 bg-lime-50">
          <p className="mb-2 font-black text-lime-800">Invite ready! 🎉</p>
          <p className="mb-3 truncate rounded-xl bg-white px-3 py-2 font-mono text-sm">{created.invite.link}</p>
          <ShareButtons invite={created.invite} />
        </div>
      )}

      <h2 className="mt-10 mb-4 text-xl font-black">All invites</h2>
      {invites.error && <ErrorState error={invites.error} onRetry={invites.reload} />}
      {invites.data?.invites.length === 0 && <p className="font-semibold text-slate-400">No invites yet.</p>}
      <div className="space-y-3">
        {invites.data?.invites.map((invite) => (
          <div key={invite._id} className="card flex flex-wrap items-center gap-3 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-black">{invite.usedBy?.name ?? (invite.name || invite.email || 'Open invite')}</p>
                <span className={`badge ${STATUS_STYLES[invite.status]}`}>{invite.status}</span>
              </div>
              <p className="truncate text-sm font-semibold text-slate-400">
                {invite.courses.map((c) => `${c.emoji} ${c.title}`).join(', ') || 'No courses'}
                {invite.cohorts?.length > 0 && ` (${invite.cohorts.map((c) => c.name).join(', ')})`} · created {timeAgo(invite.createdAt)}
              </p>
            </div>
            {invite.status === 'pending' && (
              <>
                <ShareButtons invite={invite} />
                <ConfirmButton title="Delete invite" onConfirm={() => remove(invite)}>
                  <Trash2 className="size-5" />
                </ConfirmButton>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
