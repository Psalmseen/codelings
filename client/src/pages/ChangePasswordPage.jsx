import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Spinner } from '../components/ui';
import { homePath, useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { AuthShell } from './LoginPage';

/** First sign-in (replacing the emailed temporary password) or a normal password change. */
export default function ChangePasswordPage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const required = user.mustChangePassword;
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.newPassword !== form.confirm) return setError("The new passwords don't match");
    setBusy(true);
    setError('');
    try {
      const { user: updated } = await api('/auth/change-password', {
        method: 'POST',
        body: { currentPassword: form.currentPassword, newPassword: form.newPassword, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      });
      setUser(updated);
      navigate(homePath(updated), { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={required ? `Welcome, ${user.name.split(' ')[0]}!` : 'Change password'}
      subtitle={required ? 'First, replace the temporary password from your email with your own.' : 'Choose a new password for your account.'}
    >
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="current">{required ? 'Temporary password (from your email)' : 'Current password'}</label>
          <input id="current" type="password" required autoComplete="current-password" className="input" {...field('currentPassword')} />
        </div>
        <div>
          <label className="label" htmlFor="new">New password</label>
          <input id="new" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" className="input" {...field('newPassword')} />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirm new password</label>
          <input id="confirm" type="password" required minLength={8} autoComplete="new-password" className="input" {...field('confirm')} />
        </div>
        {error && <p className="rounded-xl bg-heart-500/10 px-3 py-2 text-sm font-bold text-heart-500">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? <Spinner /> : required ? "Save and let's go!" : 'Save new password'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm font-semibold text-ink-muted">
        {required ? (
          <button className="cursor-pointer font-extrabold underline" onClick={logout}>
            Sign out
          </button>
        ) : (
          <Link to={homePath(user)} className="font-extrabold underline">
            Cancel
          </Link>
        )}
      </p>
    </AuthShell>
  );
}
