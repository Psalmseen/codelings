import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Flame, Target, Zap } from 'lucide-react';
import Mascot from '../Mascot';
import PlayerShell, { PlayerFooter } from './PlayerShell';

function StatTile({ icon: Icon, label, value, note, color, filled = true }) {
  return (
    <div className="flex-1 overflow-hidden rounded-2xl border-2" style={{ borderColor: color }}>
      <p className="py-1 text-center text-xs font-black tracking-wider text-white uppercase" style={{ backgroundColor: color }}>
        {label}
      </p>
      <div className="flex flex-col items-center px-2 py-3" style={{ color }}>
        <span className="flex items-center gap-1 text-2xl font-black">
          <Icon className="size-6" fill={filled ? 'currentColor' : 'none'} strokeWidth={filled ? 2 : 3} /> {value}
        </span>
        {note && <span className="text-xs font-extrabold">{note}</span>}
      </div>
    </div>
  );
}

export default function LessonComplete({ result, onContinue }) {
  const { xpEarned, firstTime, streakExtended, freezeEarned, leveledUp, courseCompleted, preview, total, mistakes, user } = result;
  const accuracy = total ? Math.round((total / (total + mistakes)) * 100) : 100;

  useEffect(() => {
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ['#6D4AFF', '#A3E635', '#FF9F1C', '#FF4D6D', '#38BDF8'] });
    if (courseCompleted) setTimeout(() => confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 } }), 500);
  }, [courseCompleted]);

  return (
    <PlayerShell
      onClose={onContinue}
      footer={
        <PlayerFooter>
          <div className="flex-1" />
          <button className="btn btn-primary w-full sm:w-44" onClick={onContinue} autoFocus>
            Continue
          </button>
        </PlayerFooter>
      }
    >
      <div className="flex flex-col items-center pt-6 text-center">
        <Mascot size={140} mood="excited" className="animate-float" />
        <h1 className="mt-4 text-3xl font-black text-flame-500">{courseCompleted ? 'Course complete! 🏆' : 'Lesson complete!'}</h1>
        {preview && <p className="mt-1 font-bold text-slate-400">Preview mode: nothing was saved</p>}
        {leveledUp && (
          <p className="mt-3 rounded-2xl bg-sky-100 px-4 py-2 font-black text-sky-600">Level up! You're now level {user.levelInfo.level} 🎉</p>
        )}
        {freezeEarned && (
          <p className="mt-3 rounded-2xl bg-cyan-50 px-4 py-2 font-black text-cyan-600">
            🧊 {user.streak.current}-day streak! You earned a streak freeze. It saves your streak if you miss a day.
          </p>
        )}

        <div className="mt-8 flex w-full max-w-md gap-3">
          <StatTile icon={Zap} label="XP earned" value={xpEarned} note={!firstTime && !preview ? 'Replay' : null} color="var(--color-sky-500)" />
          <StatTile icon={Target} label="Accuracy" value={`${accuracy}%`} color="var(--color-lime-500)" filled={false} />
          {!preview && (
            <StatTile
              icon={Flame}
              label="Streak"
              value={user.streak.current}
              note={streakExtended ? '+1 day!' : null}
              color="var(--color-flame-500)"
            />
          )}
        </div>
      </div>
    </PlayerShell>
  );
}
