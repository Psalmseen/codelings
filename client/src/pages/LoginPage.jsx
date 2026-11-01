import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import Mascot from '../components/Mascot';
import { Spinner } from '../components/ui';
import { homePath, useAuth } from '../context/AuthContext';

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-neon-500/10 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Mascot size={110} className="animate-float" />
          <h1 className="mt-3 text-3xl font-black text-ink">{title}</h1>
          {subtitle && <p className="mt-1 font-semibold text-ink-muted">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login(form.email, form.password);
      navigate(location.state?.from ?? homePath(user), { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back!" subtitle="Your streak is waiting for you.">
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        {error && <p className="rounded-xl bg-heart-500/10 px-3 py-2 text-sm font-bold text-heart-500">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? <Spinner /> : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm font-semibold text-ink-muted">
        New here? Open the invite link your tutor sent you.
      </p>
    </AuthShell>
  );
}
