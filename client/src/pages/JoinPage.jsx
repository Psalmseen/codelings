import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { EmptyState, PageLoader, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { AuthShell } from './LoginPage';

export default function JoinPage() {
  const { code } = useParams();
  const { register } = useAuth();
  const navigate = useNavigate();
  const { data: invite, loading } = useFetch(`/invites/${code}`);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (invite?.valid) setForm((f) => ({ ...f, name: invite.name, email: invite.email }));
  }, [invite]);

  if (loading) return <PageLoader />;

  if (!invite?.valid) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <EmptyState title="This invite doesn't work" mood="sad">
          <p className="font-semibold text-slate-500">It may have expired or already been used. Ask your tutor for a new link.</p>
          <Link to="/login" className="btn btn-secondary">
            I already have an account
          </Link>
        </EmptyState>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register({ ...form, code, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      navigate('/learn', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  return (
    <AuthShell title="You're invited!" subtitle="Create your account to start learning.">
      {invite.courses.length > 0 && (
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {invite.courses.map((course) => (
            <span key={course._id} className="badge bg-white px-3 py-1.5 text-sm text-grape-700 ring-2 ring-grape-100">
              {course.emoji} {course.title}
            </span>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="name">Your name</label>
          <input id="name" required autoComplete="name" className="input" {...field('name')} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="input read-only:text-slate-500"
            readOnly={Boolean(invite.email)}
            {...field('email')}
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input"
            placeholder="At least 8 characters"
            {...field('password')}
          />
        </div>
        {error && <p className="rounded-xl bg-heart-500/10 px-3 py-2 text-sm font-bold text-heart-500">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? <Spinner /> : "Let's go!"}
        </button>
      </form>
    </AuthShell>
  );
}
