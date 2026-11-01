import { BarList, CalendarHeatmap, ChartCard, ColumnChart, LineChart, StatTile } from './charts';

// Chart sections shared by the admin's student page and the student's own profile.

export const TYPE_LABELS = { mcq: 'Multiple choice', fill_blank: 'Fill in the blank', order_code: 'Arrange the code', code_challenge: 'Code challenge' };
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const formatMinutes = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
const percentOrDash = (v) => (v === null || v === undefined ? '–' : `${v}%`);
const shortDate = (ymd) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function StatTiles({ totals, student }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label="Time studied" value={formatMinutes(totals.minutesStudied)} note={`${formatMinutes(totals.minutesThisWeek)} this week`} />
      <StatTile label="Active days" value={totals.activeDays} note={`${totals.sessions} sessions`} />
      <StatTile label="Lessons completed" value={totals.lessonsCompleted} note={`${totals.coursesCompleted} course${totals.coursesCompleted === 1 ? '' : 's'} finished`} />
      <StatTile label="First-try accuracy" value={percentOrDash(totals.firstTryAccuracy)} note={`${percentOrDash(totals.accuracy)} overall · ${totals.answered} answers`} />
      {student && (
        <>
          <StatTile label="Avg. lesson time" value={totals.avgLessonMinutes ? `${totals.avgLessonMinutes} min` : '–'} note={`${percentOrDash(totals.completionRate)} of lessons finished once started`} />
          <StatTile label="Code challenges" value={`${totals.codePassed}/${totals.codeTried}`} note={`passed · ${totals.heartsLost} hearts lost`} />
          <StatTile label="Streak" value={`${student.streak.current} day${student.streak.current === 1 ? '' : 's'}`} note={`longest ${student.streak.longest} · ${student.streak.freezes} freeze${student.streak.freezes === 1 ? '' : 's'}`} />
          <StatTile label="Practice rounds" value={totals.practiceRounds} note={`Level ${student.level.level} · ${student.xp} XP`} />
        </>
      )}
    </div>
  );
}

export function ActivityCard({ calendar }) {
  const active = calendar.filter((d) => d.minutes > 0);
  return (
    <ChartCard
      title="Activity"
      subtitle={`${active.length} active days in the last 26 weeks`}
      table={{ columns: ['Day', 'Minutes', 'Lessons', 'XP'], rows: [...active].reverse().map((d) => [shortDate(d.date), d.minutes, d.lessons, d.xp]) }}
    >
      <CalendarHeatmap days={calendar} />
    </ChartCard>
  );
}

export function MinutesCard({ calendar }) {
  const last30 = calendar.slice(-30).map((d) => ({ label: shortDate(d.date), value: d.minutes, tip: `${shortDate(d.date)} · minutes` }));
  return (
    <ChartCard title="Minutes per day" subtitle="Last 30 days" table={{ columns: ['Day', 'Minutes'], rows: last30.map((d) => [d.label, d.value]) }}>
      <ColumnChart data={last30} />
    </ChartCard>
  );
}

export function WeeklyXpCard({ weeklyXp }) {
  const data = weeklyXp.map((w) => ({ label: shortDate(w.week), value: w.xp, tip: `Week of ${shortDate(w.week)}` }));
  return (
    <ChartCard title="XP per week" subtitle="Last 12 weeks" table={{ columns: ['Week of', 'XP'], rows: data.map((d) => [d.label, d.value]) }}>
      <LineChart data={data} />
    </ChartCard>
  );
}

export function StudyTimesCards({ hours, weekdays }) {
  const hourData = hours.map((m, h) => ({ label: `${h}`, value: m, tip: `${String(h).padStart(2, '0')}:00–${String(h + 1).padStart(2, '0')}:00 · minutes` }));
  const dayData = weekdays.map((m, i) => ({ label: WEEKDAYS[i], value: m, tip: `${WEEKDAYS[i]} · minutes` }));
  const peak = hours.indexOf(Math.max(...hours));
  return (
    <>
      <ChartCard
        title="Time of day"
        subtitle={hours.some(Boolean) ? `Usually studies around ${String(peak).padStart(2, '0')}:00 (their time)` : 'Minutes studied by hour'}
        table={{ columns: ['Hour', 'Minutes'], rows: hourData.map((d) => [`${d.label.padStart(2, '0')}:00`, d.value]) }}
      >
        <ColumnChart data={hourData} height={160} />
      </ChartCard>
      <ChartCard title="Day of week" subtitle="Minutes studied" table={{ columns: ['Day', 'Minutes'], rows: dayData.map((d) => [d.label, d.value]) }}>
        <ColumnChart data={dayData} height={160} />
      </ChartCard>
    </>
  );
}

export function AccuracyCard({ byType }) {
  const items = Object.entries(TYPE_LABELS)
    .filter(([type]) => byType[type])
    .map(([type, label]) => ({
      label,
      value: byType[type].firstTryAccuracy ?? 0,
      display: percentOrDash(byType[type].firstTryAccuracy),
      sub: `${byType[type].answered} answers · ${percentOrDash(byType[type].accuracy)} correct overall`,
    }));
  return (
    <ChartCard
      title="Accuracy by exercise type"
      subtitle="Right on the first try"
      table={{ columns: ['Type', 'First try', 'Overall', 'Answers'], rows: Object.entries(byType).map(([t, v]) => [TYPE_LABELS[t] ?? t, percentOrDash(v.firstTryAccuracy), percentOrDash(v.accuracy), v.answered]) }}
    >
      {items.length ? <BarList items={items} max={100} /> : <p className="py-6 text-center text-sm font-bold text-ink-faint">No answers yet</p>}
    </ChartCard>
  );
}
