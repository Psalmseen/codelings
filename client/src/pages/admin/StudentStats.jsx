import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Download, Info, Lock } from 'lucide-react';
import { BarList, ChartCard, DataTable } from '../../components/charts';
import {
  AccuracyCard,
  ActivityCard,
  MinutesCard,
  StatTiles,
  StudyTimesCards,
  TYPE_LABELS,
  WeeklyXpCard,
} from '../../components/StudentStatsCharts';
import { ErrorState, PageLoader, Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { downloadFile } from '../../lib/api';
import { formatDate, timeAgo } from '../../lib/format';
import { tierOf } from '../../lib/leagues';

const RESULT_LABELS = { promoted: '⬆ Promoted', demoted: '⬇ Moved down', stayed: 'Stayed', null: 'In progress' };
const pctText = (v) => (v === null || v === undefined ? '–' : `${v}%`);

function HardestQuestions({ questions }) {
  return (
    <ChartCard title="Questions they get wrong most" subtitle="With their most recent wrong answers" className="lg:col-span-2">
      {questions.length === 0 ? (
        <p className="py-6 text-center text-sm font-bold text-ink-faint">No mistakes recorded yet 🎉</p>
      ) : (
        <ul className="divide-y divide-tint/5">
          {questions.map((q) => (
            <li key={q.exerciseId} className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-extrabold text-ink">{q.prompt}</p>
                  <p className="text-xs font-bold text-ink-muted">
                    {q.courseTitle} › {q.lessonTitle} · {TYPE_LABELS[q.type] ?? q.type}
                  </p>
                </div>
                <span className="badge shrink-0 bg-red-500/15 text-red-300 light:text-red-700">
                  wrong {q.wrong} of {q.total}
                </span>
              </div>
              {q.wrongAnswers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.wrongAnswers.map((answer, i) => (
                    <pre key={i} className="max-h-28 max-w-full overflow-auto rounded-xl bg-tint/5 px-3 py-1.5 font-mono text-xs whitespace-pre-wrap text-ink-2">
                      {answer}
                    </pre>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}

const DETAIL_LABELS = {
  gender: { female: 'Female', male: 'Male', other: 'Other', prefer_not: 'Prefers not to say' },
  experience: { none: 'No coding before joining', a_little: 'A little coding before joining', some: 'Some coding before joining' },
  hasLaptop: { yes: 'Has a laptop', shared: 'Shares a laptop', no: 'Phone only' },
  preferredTime: { morning: 'Prefers mornings', afternoon: 'Prefers afternoons', evening: 'Prefers evenings', weekends: 'Prefers weekends' },
};

/** Contact, application answers and referrals. */
function StudentDetails({ data }) {
  const a = data.application;
  const facts = [
    data.contact.phone && `📞 ${data.contact.phone}`,
    a?.dateOfBirth && `🎂 ${Math.floor((Date.now() - new Date(a.dateOfBirth)) / 31557600000)} years old`,
    a && DETAIL_LABELS.gender[a.gender],
    a && [a.city, a.country].filter(Boolean).join(', '),
    a?.occupation,
    a && DETAIL_LABELS.experience[a.experience],
    a && DETAIL_LABELS.hasLaptop[a.hasLaptop],
    a && DETAIL_LABELS.preferredTime[a.preferredTime],
    a?.appliedAt && `Applied ${formatDate(a.appliedAt)}`,
  ].filter(Boolean);

  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {facts.map((fact) => (
          <span key={fact} className="badge bg-tint/10 py-1 text-ink-2">
            {fact}
          </span>
        ))}
      </div>
      {a?.goals && <p className="rounded-xl bg-tint/5 px-3 py-2 text-sm font-semibold text-ink-2">🎯 “{a.goals}”</p>}
      <p className="text-sm font-semibold text-ink-muted">
        {data.referredBy ? (
          <>
            Referred by{' '}
            <Link to={`/admin/students/${data.referredBy._id}`} className="font-extrabold text-ink-2 underline">
              {data.referredBy.name}
            </Link>
            .{' '}
          </>
        ) : null}
        Referral code <code className="font-bold text-ink-2">{data.contact.referralCode || '–'}</code>
        {data.referred.length > 0 && (
          <>
            {' '}· brought in {data.referred.length}:{' '}
            {data.referred.map((r, i) => (
              <span key={r._id}>
                {i > 0 && ', '}
                <Link to={`/admin/students/${r._id}`} className="font-extrabold text-ink-2 underline">
                  {r.name}
                </Link>
              </span>
            ))}
          </>
        )}
      </p>
    </section>
  );
}

export default function StudentStats() {
  const { studentId } = useParams();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(`/admin/analytics/students/${studentId}`);
  const [downloading, setDownloading] = useState(false);

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { student, totals } = data;
  const tier = tierOf(student.league?.tier);

  async function download() {
    setDownloading(true);
    try {
      await downloadFile(`/admin/analytics/students/${studentId}/answers.csv`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/admin/students" className="inline-flex items-center gap-1 text-sm font-extrabold text-ink-muted uppercase hover:text-ink">
        <ArrowLeft className="size-4" /> Students
      </Link>

      <section className="card flex flex-wrap items-center gap-4">
        <span className="flex size-16 items-center justify-center rounded-full bg-linear-to-br from-neon-500 to-plasma-500 text-2xl font-black text-white shadow-[0_0_24px_rgb(47_107_255/0.4)]">
          {student.name[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-black text-ink">{student.name}</h1>
          <p className="truncate text-sm font-semibold text-ink-muted">
            {student.email} · joined {formatDate(student.createdAt)} · last seen {timeAgo(student.lastSeenAt)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="badge py-1 text-white" style={{ backgroundColor: tier.color }}>
              {tier.emoji} {tier.name} League
            </span>
            <span className="badge bg-tint/10 py-1 text-ink-2">Timezone {student.timezone}</span>
            <span className="badge bg-tint/10 py-1 text-ink-2">Reminders {student.emailReminders ? 'on' : 'off'}</span>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={download} disabled={downloading}>
          {downloading ? <Spinner className="size-4" /> : <Download className="size-4" />} Every answer (CSV)
        </button>
      </section>

      <StudentDetails data={data} />

      {!totals.trackingSince && (
        <p className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-ink-2">
          <Info className="size-4 shrink-0 text-neon-400" />
          Detailed tracking starts with {student.name.split(' ')[0]}'s next lesson. Earlier lessons only count towards completions and XP.
        </p>
      )}

      <StatTiles totals={totals} student={student} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityCard calendar={data.calendar} />
        <MinutesCard calendar={data.calendar} />
        <WeeklyXpCard weeklyXp={data.weeklyXp} />
        <AccuracyCard byType={data.byType} />
        <StudyTimesCards hours={data.hours} weekdays={data.weekdays} />

        <ChartCard
          title="Course progress"
          table={{
            columns: ['Course', 'Lessons', 'Cohort', 'Enrolled', 'Last active', 'Finished'],
            rows: data.courses.map((c) => [c.title, `${c.completed}/${c.total}`, c.cohort?.name ?? '–', formatDate(c.enrolledAt), c.lastActivityAt ? timeAgo(c.lastActivityAt) : '–', c.completedAt ? formatDate(c.completedAt) : '–']),
          }}
          className="lg:col-span-2"
        >
          {data.courses.length ? (
            <BarList
              max={100}
              items={data.courses.map((c) => ({
                label: `${c.emoji} ${c.title}`,
                value: c.percent,
                display: `${c.completed}/${c.total} lessons · ${c.percent}%`,
                sub: [c.cohort && `Cohort: ${c.cohort.name}`, `enrolled ${formatDate(c.enrolledAt)}`, c.lastActivityAt && `last lesson ${timeAgo(c.lastActivityAt)}`, c.completedAt && `finished ${formatDate(c.completedAt)} 🎓`]
                  .filter(Boolean)
                  .join(' · '),
              }))}
            />
          ) : (
            <p className="py-6 text-center text-sm font-bold text-ink-faint">Not enrolled in any course</p>
          )}
        </ChartCard>

        <HardestQuestions questions={data.hardestQuestions} />

        <ChartCard title="Lessons" subtitle="Weakest first (by first-try accuracy)" className="lg:col-span-2">
          <DataTable
            columns={['Lesson', 'Sessions', 'Finished', 'Avg. time', 'First try', 'Mistakes']}
            rows={data.lessons.map((l) => [`${l.title}${l.courseTitle ? ` · ${l.courseTitle}` : ''}`, l.sessions, l.completed, l.avgMinutes ? `${l.avgMinutes} min` : '–', pctText(l.firstTryAccuracy), l.mistakes])}
          />
        </ChartCard>

        <ChartCard title="Code challenges" subtitle="Tries until passing and the checks that tripped them up" className="lg:col-span-2">
          <DataTable
            columns={['Challenge', 'Tries', 'Passed', 'Tries to pass', 'Most failed check']}
            rows={data.codeChallenges.map((c) => [
              `${c.prompt.length > 70 ? `${c.prompt.slice(0, 70)}…` : c.prompt} · ${c.lessonTitle}`,
              c.tries,
              c.passed ? 'Yes' : 'Not yet',
              c.triesToPass ?? '–',
              c.topFailedChecks[0] ? `${c.topFailedChecks[0].label} (${c.topFailedChecks[0].count}×)` : '–',
            ])}
            empty="No code challenges attempted yet"
          />
        </ChartCard>

        <ChartCard title="Recent sessions" className="lg:col-span-2">
          <DataTable
            columns={['Session', 'When', 'Time', 'Answers', 'Mistakes', 'XP', 'Status']}
            rows={data.recentSessions.map((s) => [
              `${s.title}${s.courseTitle ? ` · ${s.courseTitle}` : ''}`,
              new Date(s.startedAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
              `${s.minutes} min`,
              s.answered,
              s.mistakes,
              s.xpEarned,
              s.completed ? 'Finished' : 'Left early',
            ])}
          />
        </ChartCard>

        <ChartCard title="League history">
          <DataTable
            columns={['Week of', 'League', 'XP', 'Rank', 'Result']}
            rows={data.leagueHistory.map((w) => [formatDate(w.week), `${tierOf(w.tier).emoji} ${tierOf(w.tier).name}`, w.xp, w.rank ?? '–', RESULT_LABELS[w.result]])}
            empty="Hasn't joined a league yet"
          />
        </ChartCard>

        <ChartCard title="Badges">
          <div className="flex flex-wrap gap-2">
            {data.badges.map((b) => (
              <span key={b.key} title={b.description} className={`badge py-1.5 ${b.earned ? 'bg-neon-500/20 text-neon-200 light:text-neon-700' : 'bg-tint/5 text-ink-faint'}`}>
                {!b.earned && <Lock className="size-3" />} {b.title}
              </span>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
