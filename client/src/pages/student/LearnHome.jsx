import { Link } from 'react-router';
import { Flame, Heart, Play } from 'lucide-react';
import Mascot from '../../components/Mascot';
import { EmptyState, ErrorState, PageLoader, ProgressBar } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { courseGlow, firstName, percent, timeUntil, todayIn } from '../../lib/format';

const MAX_HEARTS = 5;

function streakStatus(user) {
  const streak = user.streak?.current ?? 0;
  const doneToday = user.streak?.lastActiveOn === todayIn(user.timezone);
  return { streak, doneToday, atRisk: streak > 0 && !doneToday };
}

function greeting({ streak, doneToday, atRisk }) {
  if (doneToday) return `Streak extended to ${streak} ${streak === 1 ? 'day' : 'days'}! 🔥 Come back tomorrow to keep it going.`;
  if (atRisk) return `Your ${streak}-day streak ends at midnight. One lesson saves it!`;
  return 'Finish one lesson today to start your streak!';
}

/** Big "pick up where you left off" card for the most recently active course. */
function ContinueCard({ course, atRisk, streak }) {
  return (
    <Link
      to={`/learn/lessons/${course.nextLesson._id}`}
      className="block overflow-hidden rounded-3xl text-white transition hover:-translate-y-0.5"
      style={courseGlow(course.color, 6)}
    >
      {atRisk && (
        <p className="flex items-center gap-2 bg-black/20 px-5 py-2 text-sm font-black">
          <Flame className="size-4 text-flame-400 light:text-flame-600" fill="currentColor" /> Keep your {streak}-day streak alive today
        </p>
      )}
      <div className="flex items-center gap-4 p-5">
        <span className="text-4xl">{course.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black tracking-wider text-white/75 uppercase">Up next in {course.title}</p>
          <p className="truncate text-xl font-black">{course.nextLesson.title}</p>
        </div>
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_4px_0_rgba(0,0,0,0.2)]" style={{ color: course.color }}>
          <Play className="size-7 translate-x-0.5" fill="currentColor" />
        </span>
      </div>
    </Link>
  );
}

export default function LearnHome() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch('/learn/courses');
  const level = user.levelInfo ?? { level: 1, xpIntoLevel: 0, xpForNext: 50 };
  const hearts = user.hearts?.count ?? MAX_HEARTS;
  const status = streakStatus(user);
  const continueCourse = data?.courses.find((c) => c.nextLesson && (!c.cohort || c.cohort.started));

  return (
    <div className="space-y-6">
      <section className="flex items-center gap-4">
        <Mascot size={84} mood={status.atRisk ? 'happy' : 'excited'} className="shrink-0 animate-float" />
        <div className="relative flex-1 rounded-3xl border border-tint/10 bg-surface p-4 shadow-[0_0_30px_rgb(47_107_255/0.15)]">
          <span className="absolute top-1/2 -left-2 size-4 -translate-y-1/2 rotate-45 border-b border-l border-tint/10 bg-surface" />
          <p className="text-lg font-black">Hi {firstName(user.name)}! 👋</p>
          <p className={`font-semibold ${status.atRisk ? 'text-flame-500' : 'text-ink-muted'}`}>{greeting(status)}</p>
        </div>
      </section>

      {continueCourse && <ContinueCard course={continueCourse} atRisk={status.atRisk} streak={status.streak} />}

      <section className="card">
        <div className="mb-2 flex items-center justify-between font-black">
          <span>Level {level.level}</span>
          <span className="text-sm text-ink-muted">
            {level.xpIntoLevel} / {level.xpForNext} XP
          </span>
        </div>
        <ProgressBar value={percent(level.xpIntoLevel, level.xpForNext)} color="var(--color-sky-400)" />
      </section>

      <Link to="/learn/practice" className="card flex items-center gap-4 transition hover:-translate-y-0.5 hover:border-tint/25">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-heart-500 text-white shadow-[0_4px_0_#c9304d]">
          <Heart className="size-6" fill="currentColor" />
        </span>
        <div className="flex-1">
          <p className="font-black">Practice round</p>
          <p className="text-sm font-semibold text-ink-muted">
            {hearts < MAX_HEARTS ? `You have ${hearts} of ${MAX_HEARTS} hearts. Practise to refill them!` : 'Quick review of what you have learned'}
          </p>
        </div>
      </Link>

      <section>
        <h2 className="mb-3 text-xl font-black">Your courses</h2>
        {loading && !data && <PageLoader />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {data?.courses.length === 0 && (
          <EmptyState title="No courses yet">
            <p className="font-semibold text-ink-muted">Your tutor will add you to a course soon. Check back shortly!</p>
          </EmptyState>
        )}
        <div className="space-y-4">
          {data?.courses.map((course) => {
            const progress = percent(course.completed, course.total);
            const finished = course.total > 0 && course.completed === course.total;
            return (
              <Link
                key={course._id}
                to={`/learn/courses/${course._id}`}
                className="card flex items-center gap-4 transition hover:-translate-y-0.5 hover:border-tint/25"
              >
                <span
                  className="flex size-16 shrink-0 items-center justify-center rounded-2xl text-3xl"
                  style={courseGlow(course.color)}
                >
                  {course.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-black">{course.title}</h3>
                  <p className="mb-2 text-sm font-bold text-ink-muted">
                    {course.completed} of {course.total} lessons
                  </p>
                  <ProgressBar value={progress} color={course.color} className="h-3" />
                </div>
                {course.cohort && !course.cohort.started ? (
                  <span className="badge shrink-0 bg-neon-500/20 py-1 text-neon-300 light:text-neon-700">Starts in {timeUntil(course.cohort.startDate)}</span>
                ) : (
                  <span className="btn btn-primary btn-sm hidden sm:inline-flex">
                    {finished ? 'Review' : course.completed ? 'Continue' : 'Start'}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
