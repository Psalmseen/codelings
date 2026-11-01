import { useState } from 'react';
import { BookCheck, Cpu, Flame, Footprints, GraduationCap, Lock, LogOut, Rocket, Snowflake, Sparkles, TrendingUp, Trophy, Zap } from 'lucide-react';
import ThemeSwitch from '../../components/ThemeSwitch';
import { ErrorState, PageLoader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../lib/api';
import { tierOf } from '../../lib/leagues';

const BADGE_ICONS = {
  first_lesson: { icon: Footprints, color: '#22C55E' },
  ten_lessons: { icon: Rocket, color: '#0EA5E9' },
  fifty_lessons: { icon: Cpu, color: '#6D4AFF' },
  streak_7: { icon: Flame, color: '#FF9F1C' },
  streak_30: { icon: Sparkles, color: '#FF4D6D' },
  xp_500: { icon: Zap, color: '#38BDF8' },
  graduate: { icon: GraduationCap, color: '#EAB308' },
  promoted: { icon: TrendingUp, color: '#14B8A6' },
};

const MAX_FREEZES = 2;

function Stat({ icon: Icon, value, label, color }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <Icon className="size-7 shrink-0" style={{ color }} fill={color} fillOpacity={0.2} />
      <div className="min-w-0">
        <p className="text-xl font-black">{value}</p>
        <p className="truncate text-sm font-bold text-ink-muted">{label}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/learn/profile');
  const [savingReminders, setSavingReminders] = useState(false);
  const tier = tierOf(user.league?.tier);

  async function toggleReminders() {
    setSavingReminders(true);
    try {
      const { user: updated } = await api('/auth/me', { method: 'PATCH', body: { emailReminders: !user.emailReminders } });
      setUser(updated);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSavingReminders(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="card flex items-center gap-4">
        <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-neon-500 text-4xl font-black text-white shadow-[0_5px_0_var(--color-neon-700)]">
          {user.name[0]?.toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black">{user.name}</h1>
          <p className="text-sm font-bold text-ink-muted">
            Joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </p>
          <span className="badge mt-2 py-1 text-sm text-white" style={{ backgroundColor: tier.color }}>
            {tier.emoji} {tier.name} League
          </span>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-black">Statistics</h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={Flame} value={user.streak.current} label="Day streak" color="#FF9F1C" />
          <Stat icon={Snowflake} value={`${user.streak.freezes} / ${MAX_FREEZES}`} label="Streak freezes" color="#38BDF8" />
          <Stat icon={Zap} value={user.xp} label={`Total XP · Level ${user.levelInfo.level}`} color="#0EA5E9" />
          <Stat icon={Trophy} value={user.streak.longest} label="Longest streak" color="#EAB308" />
          {data && <Stat icon={BookCheck} value={data.stats.lessonsCompleted} label="Lessons done" color="#22C55E" />}
          {data && <Stat icon={GraduationCap} value={data.stats.coursesCompleted} label="Courses finished" color="#6D4AFF" />}
        </div>
        <p className="mt-3 text-sm font-semibold text-ink-muted">🧊 You earn a streak freeze for every 7-day streak. It saves your streak if you miss a day.</p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-black">Badges</h2>
        {loading && !data && <PageLoader />}
        {error && <ErrorState error={error} onRetry={reload} />}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data?.badges.map((badge) => {
            const { icon: Icon, color } = BADGE_ICONS[badge.key] ?? { icon: Trophy, color: '#6D4AFF' };
            return (
              <div key={badge.key} className={`card flex flex-col items-center p-4 text-center ${badge.earned ? '' : 'opacity-50'}`}>
                <span
                  className="mb-2 flex size-14 items-center justify-center rounded-2xl"
                  style={badge.earned ? { backgroundColor: color, boxShadow: `0 4px 0 ${color}99, 0 0 24px ${color}88` } : { backgroundColor: 'color-mix(in srgb, var(--tint) 8%, transparent)' }}
                >
                  {badge.earned ? <Icon className="size-7 text-white" /> : <Lock className="size-6 text-ink-muted" />}
                </span>
                <p className="font-black">{badge.title}</p>
                <p className="text-xs font-semibold text-ink-muted">{badge.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-xl font-black">Settings</h2>
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span>
            <span className="block font-extrabold">Email reminders</span>
            <span className="text-sm font-semibold text-ink-muted">A nudge when your streak is at risk</span>
          </span>
          <input
            type="checkbox"
            className="size-6 accent-neon-500"
            checked={user.emailReminders}
            disabled={savingReminders}
            onChange={toggleReminders}
          />
        </label>
        <div>
          <span className="mb-2 block font-extrabold">Appearance</span>
          <ThemeSwitch />
        </div>
        <button className="btn btn-secondary w-full" onClick={logout}>
          <LogOut className="size-4" /> Sign out
        </button>
      </section>
    </div>
  );
}
