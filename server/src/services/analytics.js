import Cohort from '../models/Cohort.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import LeagueMembership from '../models/LeagueMembership.js';
import Lesson from '../models/Lesson.js';
import LessonAttempt from '../models/LessonAttempt.js';
import User from '../models/User.js';
import { badgesFor } from './badges.js';
import { orderedLessons } from './progress.js';
import { addDays, localDate } from './streak.js';
import { env } from '../config/env.js';
import { levelInfo } from '../utils/levels.js';

const MAX_SESSION_MS = 45 * 60 * 1000; // a tab left open shouldn't count as hours of study
const DAY_MS = 24 * 60 * 60 * 1000;
const CALENDAR_DAYS = 182; // ~26 weeks
const XP_WEEKS = 12;

export const pct = (part, total) => (total ? Math.round((part / total) * 100) : null);
const toMinutes = (ms) => Math.round(ms / 60000);
const weekOf = (ymd) => addDays(ymd, -((new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7)); // Monday

export function attemptMs(attempt) {
  const end = attempt.finishedAt ?? attempt.lastEventAt ?? attempt.startedAt;
  return Math.min(Math.max(0, end - attempt.startedAt), MAX_SESSION_MS);
}

/** Every answer with a `firstTry` flag: the first answer to an exercise within a session. */
export function flattenAnswers(attempts) {
  const rows = [];
  for (const attempt of attempts) {
    const seen = new Set();
    for (const answer of attempt.answers ?? []) {
      const key = String(answer.exerciseId);
      rows.push({ ...answer, attempt, firstTry: !seen.has(key) });
      seen.add(key);
    }
  }
  return rows;
}

/** Headline numbers for a set of sessions (one student's, or anyone's). */
export function summarize(attempts) {
  const answers = flattenAnswers(attempts);
  const lessonSessions = attempts.filter((a) => a.kind === 'lesson');
  const finished = lessonSessions.filter((a) => a.completed);
  const code = answers.filter((a) => a.type === 'code_challenge');
  const codeTried = new Set(code.map((a) => String(a.exerciseId)));
  const codePassed = new Set(code.filter((a) => a.correct).map((a) => String(a.exerciseId)));
  const firstTries = answers.filter((a) => a.firstTry);

  return {
    timeMs: attempts.reduce((sum, a) => sum + attemptMs(a), 0),
    activeDays: new Set(attempts.map((a) => a.localDate)).size,
    sessions: attempts.length,
    lessonSessions: lessonSessions.length,
    lessonsFinished: finished.length,
    avgLessonMs: finished.length ? finished.reduce((sum, a) => sum + attemptMs(a), 0) / finished.length : 0,
    answered: answers.length,
    correct: answers.filter((a) => a.correct).length,
    firstTries: firstTries.length,
    firstTryCorrect: firstTries.filter((a) => a.correct).length,
    codeTried: codeTried.size,
    codePassed: codePassed.size,
    heartsLost: code.filter((a) => !a.correct && a.attempt.kind === 'lesson').length,
    practiceRounds: attempts.filter((a) => a.kind === 'practice' && a.completed).length,
    xp: attempts.reduce((sum, a) => sum + (a.xpEarned ?? 0), 0),
    firstSession: attempts.length ? attempts.reduce((min, a) => (a.startedAt < min ? a.startedAt : min), attempts[0].startedAt) : null,
    lastSession: attempts.reduce((max, a) => (!max || a.startedAt > max ? a.startedAt : max), null),
  };
}

/** Titles and question text for lessons, keyed by id, so stats can name what they're about. */
async function lessonInfo(lessonIds) {
  const unique = [...new Set(lessonIds.filter(Boolean).map(String))];
  const lessons = await Lesson.find({ _id: { $in: unique } })
    .select('title course exercises')
    .populate('course', 'title')
    .lean();
  return new Map(
    lessons.map((lesson) => [
      String(lesson._id),
      {
        title: lesson.title,
        courseTitle: lesson.course?.title ?? '',
        exercises: new Map(lesson.exercises.map((ex) => [String(ex._id), { prompt: ex.prompt, type: ex.type }])),
      },
    ])
  );
}

const questionText = (info, lessonId, exerciseId) => info.get(String(lessonId))?.exercises.get(String(exerciseId))?.prompt ?? '(question since removed)';

/** A streak only still counts if it was kept up recently (freezes cover missed days). */
function liveStreak(user) {
  const { current, lastActiveOn, freezes } = user.streak;
  if (!current || !lastActiveOn) return 0;
  return lastActiveOn >= addDays(localDate(user.timezone), -1 - (freezes ?? 0)) ? current : 0;
}

/** Statistics for one student. `detail` adds question-level data (admin only). */
export async function studentAnalytics(userId, { detail = true } = {}) {
  const user = await User.findById(userId).lean();
  if (!user) return null;

  const [attempts, enrollments] = await Promise.all([
    LessonAttempt.find({ user: user._id }).sort({ startedAt: 1 }).lean(),
    Enrollment.find({ user: user._id }).populate('course', 'title emoji color modules').populate('cohort', 'name startDate').lean(),
  ]);
  const summary = summarize(attempts);
  const answers = flattenAnswers(attempts);
  const today = localDate(user.timezone);

  // Daily activity for the calendar heatmap
  const byDay = new Map();
  for (const a of attempts) {
    const day = byDay.get(a.localDate) ?? { ms: 0, xp: 0, lessons: 0 };
    day.ms += attemptMs(a);
    day.xp += a.xpEarned ?? 0;
    if (a.kind === 'lesson' && a.completed) day.lessons += 1;
    byDay.set(a.localDate, day);
  }
  const calendar = Array.from({ length: CALENDAR_DAYS }, (_, i) => {
    const date = addDays(today, i - CALENDAR_DAYS + 1);
    const day = byDay.get(date);
    return { date, minutes: day ? toMinutes(day.ms) : 0, xp: day?.xp ?? 0, lessons: day?.lessons ?? 0 };
  });

  // When they study
  const hours = Array(24).fill(0);
  const weekdays = Array(7).fill(0); // Monday first
  for (const a of attempts) {
    hours[a.localHour] += attemptMs(a);
    weekdays[(new Date(`${a.localDate}T00:00:00Z`).getUTCDay() + 6) % 7] += attemptMs(a);
  }

  // XP per week
  const thisWeek = weekOf(today);
  const weeklyXp = Array.from({ length: XP_WEEKS }, (_, i) => ({ week: addDays(thisWeek, (i - XP_WEEKS + 1) * 7), xp: 0 }));
  for (const a of attempts) {
    const bucket = weeklyXp.find((w) => w.week === weekOf(a.localDate));
    if (bucket) bucket.xp += a.xpEarned ?? 0;
  }

  // Accuracy by exercise type
  const byType = {};
  for (const a of answers) {
    const t = (byType[a.type] ??= { answered: 0, correct: 0, firstTries: 0, firstTryCorrect: 0 });
    t.answered += 1;
    if (a.correct) t.correct += 1;
    if (a.firstTry) {
      t.firstTries += 1;
      if (a.correct) t.firstTryCorrect += 1;
    }
  }
  for (const t of Object.values(byType)) {
    t.accuracy = pct(t.correct, t.answered);
    t.firstTryAccuracy = pct(t.firstTryCorrect, t.firstTries);
  }

  // Courses
  const courseIds = enrollments.filter((e) => e.course).map((e) => e.course._id);
  const courseLessons = await Lesson.find({ course: { $in: courseIds } }).select('course moduleId order').sort('order').lean();
  const courses = enrollments
    .filter((e) => e.course)
    .map((e) => {
      const total = orderedLessons(e.course, courseLessons.filter((l) => String(l.course) === String(e.course._id))).length;
      return {
        _id: e.course._id,
        title: e.course.title,
        emoji: e.course.emoji,
        color: e.course.color,
        completed: e.completedLessons.length,
        total,
        percent: pct(e.completedLessons.length, total) ?? 0,
        enrolledAt: e.createdAt,
        lastActivityAt: e.lastActivityAt ?? null,
        completedAt: e.completedAt ?? null,
        cohort: e.cohort ? { name: e.cohort.name, startDate: e.cohort.startDate } : null,
      };
    });

  const lessonsCompleted = enrollments.reduce((sum, e) => sum + e.completedLessons.length, 0);
  const coursesCompleted = enrollments.filter((e) => e.completedAt).length;
  const weekAgo = Date.now() - 7 * DAY_MS;

  const result = {
    student: {
      _id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      lastSeenAt: user.lastSeenAt ?? null,
      timezone: user.timezone,
      xp: user.xp,
      level: levelInfo(user.xp),
      streak: { ...user.streak, current: liveStreak(user) },
      hearts: user.hearts.count,
      league: user.league,
      emailReminders: user.emailReminders,
    },
    totals: {
      minutesStudied: toMinutes(summary.timeMs),
      minutesThisWeek: toMinutes(attempts.filter((a) => a.startedAt >= weekAgo).reduce((sum, a) => sum + attemptMs(a), 0)),
      activeDays: summary.activeDays,
      sessions: summary.sessions,
      lessonsCompleted,
      coursesCompleted,
      avgLessonMinutes: Math.round((summary.avgLessonMs / 60000) * 10) / 10,
      completionRate: pct(summary.lessonsFinished, summary.lessonSessions),
      accuracy: pct(summary.correct, summary.answered),
      firstTryAccuracy: pct(summary.firstTryCorrect, summary.firstTries),
      answered: summary.answered,
      codeTried: summary.codeTried,
      codePassed: summary.codePassed,
      heartsLost: summary.heartsLost,
      practiceRounds: summary.practiceRounds,
      trackingSince: summary.firstSession,
    },
    calendar,
    hours: hours.map(toMinutes),
    weekdays: weekdays.map(toMinutes),
    weeklyXp,
    byType,
    courses,
  };
  if (!detail) return result;

  const info = await lessonInfo([...attempts.map((a) => a.lesson), ...answers.map((a) => a.lessonId)]);

  // Questions they get wrong most
  const questions = new Map();
  for (const a of answers) {
    const q = questions.get(String(a.exerciseId)) ?? { exerciseId: a.exerciseId, lessonId: a.lessonId, type: a.type, total: 0, wrong: 0, wrongAnswers: [] };
    q.total += 1;
    if (!a.correct) {
      q.wrong += 1;
      if (a.answer && !q.wrongAnswers.includes(a.answer)) q.wrongAnswers = [a.answer, ...q.wrongAnswers].slice(0, 3);
    }
    questions.set(String(a.exerciseId), q);
  }
  const hardestQuestions = [...questions.values()]
    .filter((q) => q.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong || b.wrong / b.total - a.wrong / a.total)
    .slice(0, 12)
    .map((q) => ({
      ...q,
      prompt: questionText(info, q.lessonId, q.exerciseId),
      lessonTitle: info.get(String(q.lessonId))?.title ?? '',
      courseTitle: info.get(String(q.lessonId))?.courseTitle ?? '',
    }));

  // Per lesson: how long it takes them and how often they get things right first time
  const perLesson = new Map();
  for (const a of attempts.filter((x) => x.kind === 'lesson' && x.lesson)) {
    const l = perLesson.get(String(a.lesson)) ?? { lessonId: a.lesson, sessions: 0, completed: 0, finishedMs: 0, firstTries: 0, firstTryCorrect: 0, mistakes: 0 };
    l.sessions += 1;
    if (a.completed) {
      l.completed += 1;
      l.finishedMs += attemptMs(a);
    }
    perLesson.set(String(a.lesson), l);
  }
  for (const a of answers.filter((x) => x.attempt.kind === 'lesson')) {
    const l = perLesson.get(String(a.lessonId));
    if (!l) continue;
    if (!a.correct) l.mistakes += 1;
    if (a.firstTry) {
      l.firstTries += 1;
      if (a.correct) l.firstTryCorrect += 1;
    }
  }
  const lessons = [...perLesson.values()]
    .map((l) => ({
      lessonId: l.lessonId,
      title: info.get(String(l.lessonId))?.title ?? '(lesson since removed)',
      courseTitle: info.get(String(l.lessonId))?.courseTitle ?? '',
      sessions: l.sessions,
      completed: l.completed,
      avgMinutes: l.completed ? Math.round((l.finishedMs / l.completed / 60000) * 10) / 10 : null,
      firstTryAccuracy: pct(l.firstTryCorrect, l.firstTries),
      mistakes: l.mistakes,
    }))
    .sort((a, b) => (a.firstTryAccuracy ?? 101) - (b.firstTryAccuracy ?? 101));

  // Code challenges: tries until passing and which checks fail
  const challenges = new Map();
  for (const attempt of attempts) {
    const triesHere = new Map();
    for (const a of (attempt.answers ?? []).filter((x) => x.type === 'code_challenge')) {
      const key = String(a.exerciseId);
      const c = challenges.get(key) ?? { exerciseId: a.exerciseId, lessonId: a.lessonId, tries: 0, passed: false, passTries: [], failedChecks: {} };
      c.tries += 1;
      triesHere.set(key, (triesHere.get(key) ?? 0) + 1);
      if (a.correct) {
        if (!c.passed) c.passTries.push(triesHere.get(key));
        c.passed = true;
      }
      for (const label of a.failedChecks ?? []) c.failedChecks[label] = (c.failedChecks[label] ?? 0) + 1;
      challenges.set(key, c);
    }
  }
  const codeChallenges = [...challenges.values()].map((c) => ({
    exerciseId: c.exerciseId,
    prompt: questionText(info, c.lessonId, c.exerciseId),
    lessonTitle: info.get(String(c.lessonId))?.title ?? '',
    tries: c.tries,
    passed: c.passed,
    triesToPass: c.passTries[0] ?? null,
    topFailedChecks: Object.entries(c.failedChecks)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, count]) => ({ label, count })),
  }));

  const recentSessions = attempts
    .slice(-25)
    .reverse()
    .map((a) => ({
      _id: a._id,
      kind: a.kind,
      title: a.kind === 'practice' ? 'Practice round' : info.get(String(a.lesson))?.title ?? '(lesson since removed)',
      courseTitle: a.kind === 'practice' ? '' : info.get(String(a.lesson))?.courseTitle ?? '',
      startedAt: a.startedAt,
      minutes: Math.round((attemptMs(a) / 60000) * 10) / 10,
      completed: a.completed,
      answered: a.answers?.length ?? 0,
      mistakes: (a.answers ?? []).filter((x) => !x.correct).length,
      xpEarned: a.xpEarned ?? 0,
    }));

  const leagueHistory = (await LeagueMembership.find({ user: user._id }).sort({ week: -1 }).limit(12).lean()).map((m) => ({
    week: m.week,
    tier: m.tier,
    xp: m.xp,
    rank: m.rank ?? null,
    result: m.result,
  }));

  return {
    ...result,
    hardestQuestions,
    lessons,
    codeChallenges,
    recentSessions,
    leagueHistory,
    badges: badgesFor({
      xp: user.xp,
      lessonsCompleted,
      coursesCompleted,
      longestStreak: user.streak.longest,
      highestTier: user.league?.highestTier ?? 0,
    }),
  };
}

/** Whole-class statistics for the admin overview. Time-based figures cover the last 90 days. */
export async function classAnalytics() {
  const now = Date.now();
  const since = new Date(now - 90 * DAY_MS);
  const [students, attempts, courses, enrollments, cohorts] = await Promise.all([
    User.find({ role: 'student' }).lean(),
    LessonAttempt.find({ startedAt: { $gte: since } }).lean(),
    Course.find().lean(),
    Enrollment.find().lean(),
    Cohort.find().populate('course', 'title').lean(),
  ]);
  const studentIds = new Set(students.map((s) => String(s._id)));
  const studentAttempts = attempts.filter((a) => studentIds.has(String(a.user)));
  const answers = flattenAnswers(studentAttempts);
  const weekAgo = new Date(now - 7 * DAY_MS);
  const lastWeek = studentAttempts.filter((a) => a.startedAt >= weekAgo);

  // Active students per day (last 30 days)
  const today = localDate(env.LEAGUE_TIMEZONE);
  const activeByDay = new Map();
  for (const a of studentAttempts) {
    const set = activeByDay.get(a.localDate) ?? new Set();
    set.add(String(a.user));
    activeByDay.set(a.localDate, set);
  }
  const activePerDay = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(today, i - 29);
    return { date, students: activeByDay.get(date)?.size ?? 0 };
  });

  const activeLastWeek = new Set(lastWeek.map((a) => String(a.user)));
  const firstTries = answers.filter((a) => a.firstTry && a.attempt.startedAt >= new Date(now - 30 * DAY_MS));
  const kpis = {
    students: students.length,
    activeLastWeek: activeLastWeek.size,
    minutesLastWeek: toMinutes(lastWeek.reduce((sum, a) => sum + attemptMs(a), 0)),
    avgMinutesPerActiveStudent: activeLastWeek.size ? Math.round(lastWeek.reduce((sum, a) => sum + attemptMs(a), 0) / 60000 / activeLastWeek.size) : 0,
    lessonsCompletedLastWeek: lastWeek.filter((a) => a.kind === 'lesson' && a.completed && a.firstTime).length,
    firstTryAccuracy: pct(firstTries.filter((a) => a.correct).length, firstTries.length),
  };

  // Per course: where students drop off, and how each lesson performs
  const allLessons = await Lesson.find({ course: { $in: courses.map((c) => c._id) } })
    .select('title course moduleId order')
    .sort('order')
    .lean();
  const attemptsByLesson = new Map();
  for (const a of studentAttempts.filter((x) => x.kind === 'lesson' && x.lesson)) {
    const list = attemptsByLesson.get(String(a.lesson)) ?? [];
    list.push(a);
    attemptsByLesson.set(String(a.lesson), list);
  }
  const answersByLesson = new Map();
  for (const a of answers.filter((x) => x.attempt.kind === 'lesson')) {
    const list = answersByLesson.get(String(a.lessonId)) ?? [];
    list.push(a);
    answersByLesson.set(String(a.lessonId), list);
  }
  const courseStats = courses
    .map((course) => {
      const courseEnrollments = enrollments.filter((e) => String(e.course) === String(course._id) && studentIds.has(String(e.user)));
      const ordered = orderedLessons(course, allLessons.filter((l) => String(l.course) === String(course._id)));
      const lessons = ordered.map((lesson) => {
        const tries = attemptsByLesson.get(String(lesson._id)) ?? [];
        const finished = tries.filter((a) => a.completed);
        const lessonFirstTries = (answersByLesson.get(String(lesson._id)) ?? []).filter((a) => a.firstTry);
        return {
          _id: lesson._id,
          title: lesson.title,
          completedBy: courseEnrollments.filter((e) => e.completedLessons.some((id) => String(id) === String(lesson._id))).length,
          sessions: tries.length,
          avgMinutes: finished.length ? Math.round((finished.reduce((sum, a) => sum + attemptMs(a), 0) / finished.length / 60000) * 10) / 10 : null,
          leftEarlyRate: pct(tries.length - finished.length, tries.length),
          firstTryAccuracy: pct(lessonFirstTries.filter((a) => a.correct).length, lessonFirstTries.length),
        };
      });
      return {
        _id: course._id,
        title: course.title,
        emoji: course.emoji,
        status: course.status,
        enrolled: courseEnrollments.length,
        finished: courseEnrollments.filter((e) => e.completedAt).length,
        avgProgress: courseEnrollments.length && ordered.length
          ? Math.round(courseEnrollments.reduce((sum, e) => sum + e.completedLessons.length / ordered.length, 0) / courseEnrollments.length * 100)
          : 0,
        lessons,
      };
    })
    .filter((c) => c.enrolled > 0 || c.status === 'published');

  // Hardest questions across the class (at least 3 answers, so one slip doesn't top the list)
  const questions = new Map();
  for (const a of answers) {
    const q = questions.get(String(a.exerciseId)) ?? { exerciseId: a.exerciseId, lessonId: a.lessonId, type: a.type, total: 0, wrong: 0, students: new Set() };
    q.total += 1;
    if (!a.correct) {
      q.wrong += 1;
      q.students.add(String(a.attempt.user));
    }
    questions.set(String(a.exerciseId), q);
  }
  const info = await lessonInfo([...questions.values()].map((q) => q.lessonId));
  const hardestQuestions = [...questions.values()]
    .filter((q) => q.total >= 3 && q.wrong > 0)
    .map((q) => ({
      exerciseId: q.exerciseId,
      type: q.type,
      prompt: questionText(info, q.lessonId, q.exerciseId),
      lessonTitle: info.get(String(q.lessonId))?.title ?? '',
      courseTitle: info.get(String(q.lessonId))?.courseTitle ?? '',
      answers: q.total,
      wrongRate: pct(q.wrong, q.total),
      studentsStruggling: q.students.size,
    }))
    .sort((a, b) => b.wrongRate - a.wrongRate || b.answers - a.answers)
    .slice(0, 10);

  // Leaderboards
  const minutesLastWeek = new Map();
  for (const a of lastWeek) minutesLastWeek.set(String(a.user), (minutesLastWeek.get(String(a.user)) ?? 0) + attemptMs(a));
  const person = (s) => ({ _id: s._id, name: s.name });
  const leaderboards = {
    xp: [...students].sort((a, b) => b.xp - a.xp).slice(0, 10).map((s) => ({ ...person(s), value: s.xp })),
    minutesLastWeek: [...students]
      .map((s) => ({ ...person(s), value: toMinutes(minutesLastWeek.get(String(s._id)) ?? 0) }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    streak: students
      .map((s) => ({ ...person(s), value: liveStreak(s) }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
  };

  // Cohorts side by side
  const cohortStats = cohorts.map((cohort) => {
    const members = enrollments.filter((e) => String(e.cohort) === String(cohort._id) && studentIds.has(String(e.user)));
    const total = allLessons.filter((l) => String(l.course) === String(cohort.course?._id)).length;
    return {
      _id: cohort._id,
      name: cohort.name,
      courseTitle: cohort.course?.title ?? '',
      startDate: cohort.startDate,
      members: members.length,
      activeLastWeek: members.filter((m) => activeLastWeek.has(String(m.user))).length,
      avgProgress: members.length && total ? Math.round((members.reduce((sum, m) => sum + m.completedLessons.length, 0) / members.length / total) * 100) : 0,
      finished: members.filter((m) => m.completedAt).length,
    };
  });

  return { kpis, activePerDay, courses: courseStats, hardestQuestions, leaderboards, cohorts: cohortStats };
}

// --- CSV exports ---

const cell = (value) => {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
// The BOM makes Excel read the file as UTF-8 (names with accents, emoji)
const toCsv = (rows) => '﻿' + rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';

export async function studentsCsv() {
  const [students, attempts, enrollments] = await Promise.all([
    User.find({ role: 'student' }).sort({ name: 1 }).lean(),
    LessonAttempt.find().lean(),
    Enrollment.find().lean(),
  ]);
  const header = [
    'Name', 'Email', 'Joined', 'Last seen', 'League tier', 'XP', 'Level', 'Current streak', 'Longest streak',
    'Lessons completed', 'Courses completed', 'Minutes studied', 'Active days', 'Sessions', 'Lesson completion rate %',
    'Accuracy %', 'First-try accuracy %', 'Code challenges passed', 'Code challenges tried', 'Hearts lost',
    'Practice rounds', 'Last session',
  ];
  const rows = students.map((s) => {
    const mine = attempts.filter((a) => String(a.user) === String(s._id));
    const sum = summarize(mine);
    const theirEnrollments = enrollments.filter((e) => String(e.user) === String(s._id));
    return [
      s.name, s.email, s.createdAt, s.lastSeenAt, s.league?.tier ?? 0, s.xp, levelInfo(s.xp).level, liveStreak(s), s.streak.longest,
      theirEnrollments.reduce((n, e) => n + e.completedLessons.length, 0), theirEnrollments.filter((e) => e.completedAt).length,
      toMinutes(sum.timeMs), sum.activeDays, sum.sessions, pct(sum.lessonsFinished, sum.lessonSessions),
      pct(sum.correct, sum.answered), pct(sum.firstTryCorrect, sum.firstTries), sum.codePassed, sum.codeTried, sum.heartsLost,
      sum.practiceRounds, sum.lastSession,
    ];
  });
  return toCsv([header, ...rows]);
}

export async function studentAnswersCsv(userId) {
  const attempts = await LessonAttempt.find({ user: userId }).sort({ startedAt: 1 }).lean();
  const answers = flattenAnswers(attempts);
  const info = await lessonInfo([...attempts.map((a) => a.lesson), ...answers.map((a) => a.lessonId)]);
  const header = ['Date', 'Session', 'Course', 'Lesson', 'Question', 'Type', 'Correct', 'First try', 'Answer', 'Seconds', 'Failed checks'];
  const rows = answers.map((a) => [
    a.at,
    a.attempt.kind === 'practice' ? 'Practice round' : 'Lesson',
    info.get(String(a.lessonId))?.courseTitle ?? '',
    info.get(String(a.lessonId))?.title ?? '',
    questionText(info, a.lessonId, a.exerciseId),
    a.type,
    a.correct ? 'yes' : 'no',
    a.firstTry ? 'yes' : 'no',
    a.answer,
    Math.round((a.timeMs ?? 0) / 100) / 10,
    (a.failedChecks ?? []).join('; '),
  ]);
  return toCsv([header, ...rows]);
}
