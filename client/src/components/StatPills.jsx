import { Flame, Heart, Zap } from 'lucide-react';

function Pill({ icon: Icon, value, className, title }) {
  return (
    <span title={title} className={`flex items-center gap-1 rounded-xl px-2 py-1 text-base font-black ${className}`}>
      <Icon className="size-5" fill="currentColor" strokeWidth={2.5} />
      {value}
    </span>
  );
}

export default function StatPills({ user }) {
  const streak = user.streak?.current ?? 0;
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Pill
        icon={Flame}
        value={streak}
        title={`${streak} day streak · ${user.streak?.freezes ?? 0} freeze${user.streak?.freezes === 1 ? '' : 's'}`}
        className={streak > 0 ? 'text-flame-500' : 'text-slate-600'}
      />
      <Pill icon={Zap} value={user.xp ?? 0} title={`Level ${user.levelInfo?.level ?? 1}`} className="text-sky-400" />
      <Pill icon={Heart} value={user.hearts?.count ?? 5} title="Hearts" className="text-heart-500" />
    </div>
  );
}
