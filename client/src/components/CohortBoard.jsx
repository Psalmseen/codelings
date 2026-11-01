import { useState } from 'react';
import { ChevronDown, Flag, Zap } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { Spinner } from './ui';

const PREVIEW_COUNT = 5;

/** Private leaderboard for the student's cohort in one course. */
export default function CohortBoard({ courseId, color }) {
  const { data, loading } = useFetch(`/learn/courses/${courseId}/cohort`);
  const [expanded, setExpanded] = useState(false);

  if (loading && !data) {
    return (
      <div className="card mb-8 flex justify-center">
        <Spinner />
      </div>
    );
  }
  if (!data?.cohort) return null;

  const me = data.members.find((m) => m.isMe);
  const shown = expanded ? data.members : data.members.slice(0, PREVIEW_COUNT);
  const meHidden = me && !shown.includes(me);

  return (
    <section className="card mb-8 p-0">
      <header className="flex items-center gap-3 border-b-2 border-white/5 px-5 py-4">
        <Flag className="size-6" style={{ color }} />
        <div className="flex-1">
          <h2 className="font-black">{data.cohort.name}</h2>
          <p className="text-sm font-bold text-slate-400">
            {data.members.length} {data.members.length === 1 ? 'learner' : 'learners'} · XP earned in this course
          </p>
        </div>
      </header>
      <ol>
        {[...shown, ...(meHidden ? [me] : [])].map((member) => (
          <li key={member._id} className={`flex items-center gap-3 px-5 py-2.5 ${member.isMe ? 'bg-neon-500/10' : ''}`}>
            <span className="w-6 text-center font-black text-slate-400">{member.rank}</span>
            <span className="min-w-0 flex-1 truncate font-extrabold">
              {member.name}
              {member.isMe && ' (you)'}
            </span>
            <span className="text-sm font-bold text-slate-400">
              {member.completed}/{data.totalLessons}
            </span>
            <span className="flex w-20 items-center justify-end gap-1 font-black text-sky-400">
              <Zap className="size-4" fill="currentColor" /> {member.xp}
            </span>
          </li>
        ))}
      </ol>
      {data.members.length > PREVIEW_COUNT && (
        <button className="btn btn-ghost w-full rounded-t-none" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show less' : `Show all ${data.members.length}`}
          <ChevronDown className={`size-4 transition ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </section>
  );
}
