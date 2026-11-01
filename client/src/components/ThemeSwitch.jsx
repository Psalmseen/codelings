import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const OPTIONS = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

/** System / Light / Dark picker. `compact` renders one icon button that cycles through them. */
export default function ThemeSwitch({ compact = false }) {
  const { preference, setPreference } = useTheme();
  const index = OPTIONS.findIndex((o) => o.value === preference);

  if (compact) {
    const { icon: Icon, label } = OPTIONS[index];
    const next = OPTIONS[(index + 1) % OPTIONS.length];
    return (
      <button className="icon-btn" onClick={() => setPreference(next.value)} title={`Theme: ${label} (switch to ${next.label})`} aria-label={`Theme: ${label}`}>
        <Icon className="size-5" />
      </button>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl border border-tint/10 bg-tint/5 p-1" role="radiogroup" aria-label="Theme">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={preference === value}
          onClick={() => setPreference(value)}
          className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-extrabold transition ${
            preference === value
              ? 'bg-linear-to-r from-neon-500 to-plasma-500 text-white shadow-[0_0_16px_rgb(47_107_255/0.4)]'
              : 'text-ink-muted hover:bg-tint/10 hover:text-ink'
          }`}
        >
          <Icon className="size-4" /> {label}
        </button>
      ))}
    </div>
  );
}
