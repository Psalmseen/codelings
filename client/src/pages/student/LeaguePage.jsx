import { Fragment, useEffect } from 'react';
import { Link } from 'react-router';
import { ArrowDown, ArrowUp, Clock, Zap } from 'lucide-react';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../lib/api';
import { timeUntil } from '../../lib/format';
import { TIERS, tierOf } from '../../lib/leagues';

function TierLadder({ current }) {
  return (
    <div className="flex justify-center gap-1.5 sm:gap-2">
      {TIERS.map((tier, i) => (
        <span
          key={tier.name}
          title={`${tier.name} League`}
          className={`flex items-center justify-center rounded-2xl transition ${
            i === current ? 'size-14 text-3xl shadow-lg' : 'size-9 text-lg sm:size-10'
          } ${i > current ? 'opacity-30 grayscale' : ''}`}
          style={{ backgroundColor: i <= current ? tier.color : 'color-mix(in srgb, var(--tint) 8%, transparent)', boxShadow: i === current ? `0 0 30px ${tier.color}` : undefined }}
        >
          {tier.emoji}
        </span>
      ))}
    </div>
  );
}

function ZoneDivider({ zone, nextTier }) {
  const up = zone === 'promote';
  return (
    <li className={`flex items-center gap-2 px-4 py-2 text-xs font-black tracking-wider uppercase ${up ? 'text-lime-400 light:text-lime-600' : 'text-heart-500'}`}>
      {up ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
      {up ? `Promotion zone${nextTier ? `: ${nextTier.name}` : ''}` : 'Demotion zone'}
      <span className={`h-0.5 flex-1 rounded ${up ? 'bg-lime-400/25' : 'bg-red-500/25'}`} />
    </li>
  );
}

const RANK_STYLES = ['bg-yellow-400 text-white', 'bg-slate-400 text-white', 'bg-orange-300 text-white'];

export default function LeaguePage() {
  const { setUser } = useAuth();
  const { data, loading, error, reload } = useFetch('/learn/league');

  // Opening the league may have just closed last week, so pick up new notices / tier
  useEffect(() => {
    if (data) api('/auth/me').then(({ user }) => setUser(user)).catch(() => {});
  }, [data, setUser]);

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const tier = tierOf(data.tier);
  const nextTier = TIERS[data.tier + 1];
  const lastPromoteIndex = data.members.findLastIndex((m) => m.zone === 'promote');
  const firstDemoteIndex = data.members.findIndex((m) => m.zone === 'demote');

  return (
    <div className="space-y-6">
      <section className="text-center">
        <TierLadder current={data.tier} />
        <h1 className="mt-4 text-3xl font-black">{tier.name} League</h1>
        <p className="mt-1 flex items-center justify-center gap-1.5 font-bold text-ink-muted">
          <Clock className="size-4" /> Week ends in {timeUntil(data.endsAt)}
        </p>
      </section>

      {!data.joined ? (
        <EmptyState title="Join this week's league!">
          <p className="font-semibold text-ink-muted">
            Finish a lesson to get placed in a group of up to 20 learners. The top learners move up to {nextTier ? `${nextTier.name} League` : 'glory'} each
            week!
          </p>
          <Link to="/learn" className="btn btn-primary">
            Start a lesson
          </Link>
        </EmptyState>
      ) : (
        <ol className="card overflow-hidden p-0">
          {data.members.map((member, index) => (
            <Fragment key={member._id ?? index}>
              {index === firstDemoteIndex && <ZoneDivider zone="demote" />}
              <li
                className={`flex items-center gap-3 px-4 py-3 ${
                  member.isMe ? 'bg-neon-500/10 ring-2 ring-neon-400/30 ring-inset' : index % 2 ? 'bg-tint/[0.02]' : ''
                }`}
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                    RANK_STYLES[index] ?? (member.zone === 'promote' ? 'text-lime-400 light:text-lime-600' : member.zone === 'demote' ? 'text-heart-500' : 'text-ink-muted')
                  }`}
                >
                  {member.rank}
                </span>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neon-500/20 font-black text-neon-300 light:text-neon-700">
                  {member.name[0]?.toUpperCase()}
                </span>
                <span className={`min-w-0 flex-1 truncate font-extrabold ${member.isMe ? 'text-neon-200 light:text-neon-700' : ''}`}>
                  {member.name}
                  {member.isMe && ' (you)'}
                </span>
                <span className="flex items-center gap-1 font-black text-sky-400 light:text-sky-600">
                  <Zap className="size-4" fill="currentColor" /> {member.xp} XP
                </span>
              </li>
              {index === lastPromoteIndex && <ZoneDivider zone="promote" nextTier={nextTier} />}
            </Fragment>
          ))}
        </ol>
      )}
    </div>
  );
}
