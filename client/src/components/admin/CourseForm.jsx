import { useState } from 'react';
import { Spinner } from '../ui';

const COLORS = ['#6D4AFF', '#22C55E', '#0EA5E9', '#F97316', '#EC4899', '#EAB308', '#14B8A6', '#EF4444'];
const EMOJIS = ['💻', '🌐', '🎨', '⚡', '🧩', '🚀', '📱', '🛠️', '🧠', '🐛'];

export default function CourseForm({ initial, submitLabel, onSubmit }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    emoji: initial?.emoji ?? EMOJIS[0],
    color: initial?.color ?? COLORS[0],
    pacing: initial?.pacing ?? 'self',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="label" htmlFor="course-title">Title</label>
        <input
          id="course-title"
          required
          className="input"
          placeholder="e.g. JavaScript for Beginners"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>
      <div>
        <label className="label" htmlFor="course-description">Description</label>
        <textarea
          id="course-description"
          rows={3}
          className="input"
          placeholder="What will students be able to build?"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div>
        <span className="label">Icon</span>
        <div className="flex flex-wrap gap-2">
          {EMOJIS.map((emoji) => (
            <button
              type="button"
              key={emoji}
              onClick={() => setForm({ ...form, emoji })}
              className={`size-11 cursor-pointer rounded-xl text-2xl transition ${
                form.emoji === emoji ? 'bg-grape-100 ring-2 ring-grape-400' : 'bg-slate-100 hover:bg-slate-200'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="label">Colour</span>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((color) => (
            <button
              type="button"
              key={color}
              aria-label={color}
              onClick={() => setForm({ ...form, color })}
              className={`size-9 cursor-pointer rounded-full transition ${form.color === color ? 'ring-4 ring-offset-2' : ''}`}
              style={{ backgroundColor: color, '--tw-ring-color': color }}
            />
          ))}
        </div>
      </div>
      <div>
        <span className="label">Pacing</span>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['self', 'Self-paced', 'Join and learn any time'],
            ['cohort', 'Cohort', 'Groups start together'],
          ].map(([value, label, hint]) => (
            <button
              type="button"
              key={value}
              onClick={() => setForm({ ...form, pacing: value })}
              className={`cursor-pointer rounded-2xl border-2 p-3 text-left transition ${
                form.pacing === value ? 'border-grape-400 bg-grape-50' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="block font-black">{label}</span>
              <span className="text-sm font-semibold text-slate-400">{hint}</span>
            </button>
          ))}
        </div>
      </div>
      {error && <p className="rounded-xl bg-heart-500/10 px-3 py-2 text-sm font-bold text-heart-500">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? <Spinner /> : submitLabel}
      </button>
    </form>
  );
}
