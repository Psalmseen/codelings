import { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { formatDate } from '../../lib/format';
import { ConfirmButton, Spinner } from '../ui';

const todayInput = () => new Date().toISOString().slice(0, 10);

/** Lists a course's cohorts and adds new ones. `mutate` is the course builder's mutation helper. */
export default function CohortsCard({ cohorts, mutate }) {
  const [form, setForm] = useState({ name: '', startDate: todayInput() });
  const [busy, setBusy] = useState(false);

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    // Start at local midnight of the chosen day
    const ok = await mutate('/cohorts', 'POST', { name: form.name, startDate: new Date(`${form.startDate}T00:00:00`).toISOString() }, 'Cohort created');
    setBusy(false);
    if (ok) setForm({ name: '', startDate: todayInput() });
  }

  return (
    <section className="card mb-6 p-0">
      <header className="flex items-center gap-3 border-b-2 border-tint/5 px-5 py-4">
        <Users className="size-6 text-neon-400 light:text-neon-600" />
        <div>
          <h2 className="text-lg font-black">Cohorts</h2>
          <p className="text-sm font-bold text-ink-muted">Students in a cohort start on the same day and share a private leaderboard.</p>
        </div>
      </header>

      {cohorts.length > 0 && (
        <ul className="divide-y-2 divide-tint/5">
          {cohorts.map((cohort) => {
            const started = new Date(cohort.startDate) <= new Date();
            return (
              <li key={cohort._id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">{cohort.name}</p>
                  <p className="text-sm font-bold text-ink-muted">
                    {started ? 'Started' : 'Starts'} {formatDate(cohort.startDate)} · {cohort.studentCount} student{cohort.studentCount === 1 ? '' : 's'}
                  </p>
                </div>
                <span className={`badge ${started ? 'bg-lime-400/15 text-lime-300 light:text-lime-700' : 'bg-orange-400/15 text-orange-300 light:text-orange-700'}`}>{started ? 'Running' : 'Upcoming'}</span>
                <ConfirmButton title="Delete cohort (students stay enrolled)" confirmLabel="Delete?" onConfirm={() => mutate(`/cohorts/${cohort._id}`, 'DELETE', undefined, 'Cohort deleted')}>
                  <Trash2 className="size-5" />
                </ConfirmButton>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={add} className="flex flex-col gap-2 px-5 py-4 sm:flex-row">
        <input className="input py-2.5" placeholder="e.g. January 2027 batch" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input
          type="date"
          className="input py-2.5 sm:w-48"
          required
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          aria-label="Start date"
        />
        <button className="btn btn-secondary shrink-0" disabled={busy || !form.name.trim()}>
          {busy ? <Spinner className="size-4" /> : <Plus className="size-4" />} Add cohort
        </button>
      </form>
    </section>
  );
}
