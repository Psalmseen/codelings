import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Gift, MailCheck } from 'lucide-react';
import Mascot from '../components/Mascot';
import { Spinner } from '../components/ui';
import { api } from '../lib/api';
import { AuthShell } from './LoginPage';

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  referralCode: '',
  dateOfBirth: '',
  gender: '',
  city: '',
  country: '',
  occupation: '',
  experience: '',
  goals: '',
  hasLaptop: '',
  preferredTime: '',
  website: '', // honeypot, hidden from people
};

function Field({ label, optional, children }) {
  return (
    <label className="block">
      <span className="label">
        {label} {optional ? <span className="font-semibold text-ink-faint">(optional)</span> : <span className="text-heart-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function Choice({ value, onChange, options }) {
  return (
    <select className="input py-2.5" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose…</option>
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

export default function ApplyPage() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ ...EMPTY, referralCode: params.get('ref') ?? '' });
  const [referrer, setReferrer] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const text = (key) => ({ value: form[key], onChange: (e) => set(key)(e.target.value) });

  // Show who referred them when they arrive through a referral link
  useEffect(() => {
    const code = form.referralCode.trim();
    if (code.length < 4) return setReferrer(null);
    const timer = setTimeout(() => {
      api(`/apply/referral/${encodeURIComponent(code)}`)
        .then((res) => setReferrer(res.valid ? res.referrerName : false))
        .catch(() => setReferrer(null));
    }, 400);
    return () => clearTimeout(timer);
  }, [form.referralCode]);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/apply', { method: 'POST', body: { ...form, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } });
      setDone(true);
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthShell title="Application sent! 🎉" subtitle="Thanks for applying to Codelings.">
        <div className="card space-y-3 text-center">
          <MailCheck className="mx-auto size-10 text-neon-400" />
          <p className="font-semibold text-ink-2">
            We've emailed <b className="text-ink">{form.email}</b> to confirm. Once your tutor approves your application, you'll get another email with
            your login details.
          </p>
          <p className="text-sm font-semibold text-ink-faint">Can't see it? Check your spam folder.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <Mascot size={96} className="animate-float" />
          <h1 className="mt-3 text-3xl font-black text-ink">Learn to code with Codelings</h1>
          <p className="mt-1 font-semibold text-ink-muted">Bite-sized lessons, streaks, XP and leagues. Apply to join the class.</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          <section className="space-y-4">
            <h2 className="text-lg font-black text-ink">Your details</h2>
            <Field label="Full name">
              <input className="input" required autoComplete="name" {...text('name')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email">
                <input className="input" type="email" required autoComplete="email" {...text('email')} />
              </Field>
              <Field label="Phone number">
                <input className="input" type="tel" required autoComplete="tel" placeholder="+234…" {...text('phone')} />
              </Field>
            </div>
            <Field label="Referral code" optional>
              <input className="input" autoCapitalize="off" placeholder="From a friend who's already learning" {...text('referralCode')} />
              {referrer && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-lime-400 light:text-lime-700">
                  <Gift className="size-4" /> Referred by {referrer}
                </p>
              )}
              {referrer === false && <p className="mt-1.5 text-sm font-bold text-orange-400 light:text-orange-600">We don't recognise this code yet.</p>}
            </Field>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-ink">About you</h2>
              <p className="text-sm font-semibold text-ink-muted">Optional, but it helps your tutor plan your learning.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date of birth" optional>
                <input className="input py-2.5" type="date" max={new Date().toISOString().slice(0, 10)} {...text('dateOfBirth')} />
              </Field>
              <Field label="Gender" optional>
                <Choice value={form.gender} onChange={set('gender')} options={[['female', 'Female'], ['male', 'Male'], ['other', 'Other'], ['prefer_not', 'Prefer not to say']]} />
              </Field>
              <Field label="City / state" optional>
                <input className="input py-2.5" autoComplete="address-level2" {...text('city')} />
              </Field>
              <Field label="Country" optional>
                <input className="input py-2.5" autoComplete="country-name" {...text('country')} />
              </Field>
              <Field label="Occupation or school" optional>
                <input className="input py-2.5" placeholder="e.g. SS2 student, nurse, freelancer" {...text('occupation')} />
              </Field>
              <Field label="Coding experience" optional>
                <Choice value={form.experience} onChange={set('experience')} options={[['none', 'None yet'], ['a_little', 'A little'], ['some', 'Some']]} />
              </Field>
              <Field label="Do you have a laptop?" optional>
                <Choice value={form.hasLaptop} onChange={set('hasLaptop')} options={[['yes', 'Yes'], ['shared', 'I share one'], ['no', 'No, phone only']]} />
              </Field>
              <Field label="Best time to learn" optional>
                <Choice
                  value={form.preferredTime}
                  onChange={set('preferredTime')}
                  options={[['morning', 'Mornings'], ['afternoon', 'Afternoons'], ['evening', 'Evenings'], ['weekends', 'Weekends']]}
                />
              </Field>
            </div>
            <Field label="What do you want to achieve?" optional>
              <textarea className="input" rows={3} placeholder="e.g. build my own website, get a tech job, help my business" {...text('goals')} />
            </Field>
          </section>

          {/* Honeypot: hidden from people, filled by spam bots */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" {...text('website')} />

          {error && <p className="rounded-xl bg-heart-500/10 px-3 py-2 text-sm font-bold text-heart-500">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? <Spinner /> : 'Send application'}
          </button>
          <p className="text-center text-sm font-semibold text-ink-muted">
            Already a student?{' '}
            <Link to="/login" className="font-extrabold text-neon-300 underline light:text-neon-600">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
