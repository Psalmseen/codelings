import { useState } from 'react';
import { Link } from 'react-router';
import { Download } from 'lucide-react';
import { BarList, ChartCard, ColumnChart, DataTable, StatTile } from '../../components/charts';
import { formatMinutes, TYPE_LABELS } from '../../components/StudentStatsCharts';
import { EmptyState, ErrorState, PageHeader, PageLoader, Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { downloadFile } from '../../lib/api';
import { formatDate } from '../../lib/format';

const pctText = (v) => (v === null || v === undefined ? '–' : `${v}%`);
const shortDate = (ymd) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });

function Leaderboard({ title, entries, format }) {
  return (
    <ChartCard title={title}>
      {entries.length === 0 ? (
        <p className="py-4 text-center text-sm font-bold text-ink-faint">Nobody yet</p>
      ) : (
        <ol className="space-y-1.5">
          {entries.map((e, i) => (
            <li key={e._id} className="flex items-center gap-3">
              <span className="w-5 text-right text-sm font-black text-ink-faint">{i + 1}</span>
              <Link to={`/admin/students/${e._id}`} className="min-w-0 flex-1 truncate font-extrabold text-ink-2 hover:text-neon-300 light:hover:text-neon-600">
                {e.name}
              </Link>
              <span className="font-black text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {format(e.value)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </ChartCard>
  );
}

function CourseFunnel({ courses }) {
  const [courseId, setCourseId] = useState(courses[0]?._id);
  const course = courses.find((c) => c._id === courseId) ?? courses[0];
  if (!course) return null;

  return (
    <ChartCard
      title="Where students drop off"
      subtitle={`${course.enrolled} enrolled · ${course.finished} finished · ${course.avgProgress}% average progress`}
      table={{
        columns: ['Lesson', 'Completed by', 'Sessions', 'Avg. time', 'Left early', 'First try'],
        rows: course.lessons.map((l) => [l.title, `${l.completedBy}/${course.enrolled}`, l.sessions, l.avgMinutes ? `${l.avgMinutes} min` : '–', pctText(l.leftEarlyRate), pctText(l.firstTryAccuracy)]),
      }}
      className="lg:col-span-2"
    >
      {courses.length > 1 && (
        <select className="input mb-4 w-auto py-2" value={course._id} onChange={(e) => setCourseId(e.target.value)} aria-label="Course">
          {courses.map((c) => (
            <option key={c._id} value={c._id}>
              {c.emoji} {c.title}
            </option>
          ))}
        </select>
      )}
      {course.lessons.length ? (
        <BarList
          max={Math.max(course.enrolled, 1)}
          items={course.lessons.map((l, i) => ({
            label: `${i + 1}. ${l.title}`,
            value: l.completedBy,
            display: `${l.completedBy}/${course.enrolled} students`,
            sub: [l.avgMinutes && `avg ${l.avgMinutes} min`, l.leftEarlyRate !== null && `${l.leftEarlyRate}% left early`, l.firstTryAccuracy !== null && `${l.firstTryAccuracy}% right first try`]
              .filter(Boolean)
              .join(' · '),
          }))}
        />
      ) : (
        <p className="py-6 text-center text-sm font-bold text-ink-faint">This course has no lessons yet</p>
      )}
    </ChartCard>
  );
}

export default function AdminAnalytics() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/admin/analytics/overview');
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      await downloadFile('/admin/analytics/students.csv');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <PageHeader title="Analytics" subtitle="How the whole class is doing. Time-based numbers cover the last 90 days.">
        <button className="btn btn-secondary" onClick={download} disabled={downloading}>
          {downloading ? <Spinner className="size-4" /> : <Download className="size-4" />} All students (CSV)
        </button>
      </PageHeader>

      {loading && !data && <PageLoader />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.kpis.students === 0 && (
        <EmptyState title="No students yet">
          <p className="font-semibold text-ink-muted">Statistics appear once students start learning.</p>
        </EmptyState>
      )}

      {data && data.kpis.students > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile label="Students" value={data.kpis.students} />
            <StatTile label="Active this week" value={data.kpis.activeLastWeek} note={`of ${data.kpis.students} students`} />
            <StatTile label="Time studied this week" value={formatMinutes(data.kpis.minutesLastWeek)} note={`${formatMinutes(data.kpis.avgMinutesPerActiveStudent)} per active student`} />
            <StatTile label="Lessons completed" value={data.kpis.lessonsCompletedLastWeek} note="this week" />
            <StatTile label="First-try accuracy" value={pctText(data.kpis.firstTryAccuracy)} note="last 30 days" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Active students per day"
              subtitle="Last 30 days"
              table={{ columns: ['Day', 'Students'], rows: data.activePerDay.map((d) => [shortDate(d.date), d.students]) }}
              className="lg:col-span-2"
            >
              <ColumnChart data={data.activePerDay.map((d) => ({ label: shortDate(d.date), value: d.students, tip: `${shortDate(d.date)} · active students` }))} />
            </ChartCard>

            <CourseFunnel courses={data.courses} />

            <ChartCard title="Hardest questions" subtitle="Across the class, with at least 3 answers" className="lg:col-span-2">
              <DataTable
                columns={['Question', 'Wrong', 'Answers', 'Students struggling']}
                rows={data.hardestQuestions.map((q) => [
                  `${q.prompt.length > 80 ? `${q.prompt.slice(0, 80)}…` : q.prompt} · ${q.lessonTitle} (${TYPE_LABELS[q.type] ?? q.type})`,
                  `${q.wrongRate}%`,
                  q.answers,
                  q.studentsStruggling,
                ])}
                empty="Not enough answers yet"
              />
            </ChartCard>

            <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
              <Leaderboard title="Most XP" entries={data.leaderboards.xp} format={(v) => `${v} XP`} />
              <Leaderboard title="Most time this week" entries={data.leaderboards.minutesLastWeek} format={formatMinutes} />
              <Leaderboard title="Longest live streak" entries={data.leaderboards.streak} format={(v) => `🔥 ${v}`} />
            </div>

            {data.cohorts.length > 0 && (
              <ChartCard title="Cohorts" className="lg:col-span-2">
                <DataTable
                  columns={['Cohort', 'Started', 'Members', 'Active this week', 'Avg. progress', 'Finished']}
                  rows={data.cohorts.map((c) => [`${c.name} · ${c.courseTitle}`, formatDate(c.startDate), c.members, c.activeLastWeek, `${c.avgProgress}%`, c.finished])}
                />
              </ChartCard>
            )}
          </div>
        </div>
      )}
    </>
  );
}
