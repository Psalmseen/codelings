import { Router } from 'express';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import LeagueMembership from '../models/LeagueMembership.js';
import Lesson from '../models/Lesson.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { addLeagueXp, closeFinishedWeeks, currentWeek, sortedGroup, weekEndsAt, zoneFor } from '../services/league.js';
import { lessonStates, nextLesson, orderedLessons } from '../services/progress.js';
import { lessonSummaries } from '../services/stats.js';
import { recordActivity, refreshStreak } from '../services/streak.js';
import { HttpError } from '../utils/httpError.js';
import { levelInfo } from '../utils/levels.js';

export const MAX_HEARTS = 5;
const PRACTICE_SIZE = 6;

const BADGES = [
  { key: 'first_lesson', title: 'First steps', description: 'Complete your first lesson', earned: (s) => s.lessonsCompleted >= 1 },
  { key: 'ten_lessons', title: 'On a roll', description: 'Complete 10 lessons', earned: (s) => s.lessonsCompleted >= 10 },
  { key: 'fifty_lessons', title: 'Code machine', description: 'Complete 50 lessons', earned: (s) => s.lessonsCompleted >= 50 },
  { key: 'streak_7', title: 'Week warrior', description: 'Reach a 7-day streak', earned: (s) => s.longestStreak >= 7 },
  { key: 'streak_30', title: 'Unstoppable', description: 'Reach a 30-day streak', earned: (s) => s.longestStreak >= 30 },
  { key: 'xp_500', title: 'XP hunter', description: 'Earn 500 XP', earned: (s) => s.xp >= 500 },
  { key: 'graduate', title: 'Graduate', description: 'Finish a whole course', earned: (s) => s.coursesCompleted >= 1 },
  { key: 'promoted', title: 'Moving up', description: 'Get promoted to a new league', earned: (s) => s.highestTier >= 1 },
];

const router = Router();
router.use(requireAuth);

const cohortSummary = (cohort) =>
  cohort && { _id: cohort._id, name: cohort.name, startDate: cohort.startDate, started: cohort.startDate <= new Date() };

router.get('/courses', async (req, res) => {
  const enrollments = await Enrollment.find({ user: req.user._id })
    .populate('course', 'title description emoji color status modules')
    .populate('cohort', 'name startDate')
    .sort({ lastActivityAt: -1, createdAt: -1 });
  const visible = enrollments.filter((e) => e.course?.status === 'published');
  const lessons = await Lesson.find({ course: { $in: visible.map((e) => e.course._id) } })
    .select('title moduleId order course')
    .sort('order');

  res.json({
    courses: visible.map((e) => ({
      _id: e.course._id,
      title: e.course.title,
      description: e.course.description,
      emoji: e.course.emoji,
      color: e.course.color,
      completed: e.completedLessons.length,
      total: lessons.filter((l) => l.course.equals(e.course._id)).length,
      cohort: cohortSummary(e.cohort),
      lastActivityAt: e.lastActivityAt ?? null,
      nextLesson: nextLessonSummary(e, lessons),
    })),
  });
});

function nextLessonSummary(enrollment, lessons) {
  const ordered = orderedLessons(enrollment.course, lessons.filter((l) => l.course.equals(enrollment.course._id)));
  const next = nextLesson(ordered, enrollment.completedLessons);
  return next && { _id: next._id, title: next.title };
}

/** Loads a course and the user's enrollment; 404 unless enrolled in a live course (admins see all). */
async function loadCourseForUser(user, courseId) {
  const course = await Course.findById(courseId);
  const isAdmin = user.role === 'admin';
  const enrollment =
    isAdmin || !course ? null : await Enrollment.findOne({ user: user._id, course: course._id }).populate('cohort', 'name startDate');
  if (!course || (!isAdmin && (!enrollment || course.status !== 'published'))) throw new HttpError(404, 'Course not found');
  // A cohort that hasn't started keeps every lesson locked
  const waiting = Boolean(enrollment?.cohort && enrollment.cohort.startDate > new Date());
  return { course, enrollment, isAdmin, waiting };
}

// The course "path": modules with lessons marked completed / available / locked
router.get('/courses/:courseId', async (req, res) => {
  const { course, enrollment, isAdmin, waiting } = await loadCourseForUser(req.user, req.params.courseId);
  const lessons = orderedLessons(course, await lessonSummaries(course._id));
  const completedIds = enrollment?.completedLessons ?? [];
  const states = lessonStates(lessons, completedIds, isAdmin);

  res.json({
    course: { _id: course._id, title: course.title, description: course.description, emoji: course.emoji, color: course.color },
    cohort: cohortSummary(enrollment?.cohort),
    modules: course.modules.map((mod) => ({
      _id: mod._id,
      title: mod.title,
      description: mod.description,
      lessons: lessons
        .filter((lesson) => lesson.moduleId.equals(mod._id))
        .map((lesson) => ({ ...lesson, state: waiting ? 'locked' : states.get(String(lesson._id)) })),
    })),
    completed: completedIds.length,
    total: lessons.length,
  });
});

// Private leaderboard for the student's cohort: XP earned in this course
router.get('/courses/:courseId/cohort', async (req, res) => {
  const { course, enrollment } = await loadCourseForUser(req.user, req.params.courseId);
  if (!enrollment?.cohort) return res.json({ cohort: null, members: [] });

  const [members, lessons] = await Promise.all([
    Enrollment.find({ course: course._id, cohort: enrollment.cohort._id }).populate('user', 'name'),
    Lesson.find({ course: course._id }).select('xp'),
  ]);
  const xpByLesson = new Map(lessons.map((l) => [String(l._id), l.xp]));
  const ranked = members
    .filter((m) => m.user)
    .map((m) => ({
      _id: m.user._id,
      name: m.user.name,
      completed: m.completedLessons.length,
      xp: m.completedLessons.reduce((sum, id) => sum + (xpByLesson.get(String(id)) ?? 0), 0),
      isMe: m.user._id.equals(req.user._id),
    }))
    .sort((a, b) => b.xp - a.xp || b.completed - a.completed)
    .map((m, i) => ({ ...m, rank: i + 1 }));

  res.json({ cohort: cohortSummary(enrollment.cohort), members: ranked, totalLessons: lessons.length });
});

/** Loads a lesson the user may play: enrolled, course live, cohort started and the lesson unlocked. */
async function loadPlayableLesson(user, lessonId) {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new HttpError(404, 'Lesson not found');
  const { course, enrollment, isAdmin, waiting } = await loadCourseForUser(user, lesson.course);
  if (waiting) {
    throw new HttpError(403, `Your cohort starts on ${enrollment.cohort.startDate.toDateString()}. See you then!`);
  }

  const ordered = orderedLessons(course, await Lesson.find({ course: course._id }).select('moduleId order').sort('order'));
  const state = lessonStates(ordered, enrollment?.completedLessons ?? [], isAdmin).get(String(lesson._id));
  if (!state) throw new HttpError(404, 'Lesson not found');
  if (state === 'locked') throw new HttpError(403, 'Finish the earlier lessons to unlock this one');

  return { lesson, course, enrollment, ordered, state, isAdmin };
}

router.get('/lessons/:id', async (req, res) => {
  const { lesson, course, state, isAdmin } = await loadPlayableLesson(req.user, req.params.id);
  res.json({
    lesson: {
      _id: lesson._id,
      title: lesson.title,
      videoUrl: lesson.videoUrl,
      reading: lesson.reading,
      xp: lesson.xp,
      exercises: lesson.exercises,
    },
    course: { _id: course._id, title: course.title, emoji: course.emoji, color: course.color },
    completed: state === 'completed',
    preview: isAdmin,
  });
});

router.post('/lessons/:id/complete', async (req, res) => {
  const { lesson, enrollment, ordered, isAdmin } = await loadPlayableLesson(req.user, req.params.id);
  if (isAdmin) {
    return res.json({ preview: true, xpEarned: 0, firstTime: false, streakExtended: false, freezeEarned: false, leveledUp: false, courseCompleted: false, user: req.user });
  }

  // Atomic so a double submit can't award XP twice
  const { modifiedCount } = await Enrollment.updateOne(
    { _id: enrollment._id, completedLessons: { $ne: lesson._id } },
    { $push: { completedLessons: lesson._id } }
  );
  const firstTime = modifiedCount === 1;
  const xpEarned = firstTime ? lesson.xp : 0;

  const updated = await Enrollment.findById(enrollment._id);
  const done = new Set(updated.completedLessons.map(String));
  const courseCompleted = firstTime && ordered.every((l) => done.has(String(l._id)));
  updated.lastActivityAt = new Date();
  if (courseCompleted) updated.completedAt = new Date();

  const user = req.user;
  const levelBefore = levelInfo(user.xp).level;
  user.xp += xpEarned;
  refreshStreak(user);
  const { extended, freezeEarned } = recordActivity(user);
  await Promise.all([updated.save(), user.save(), addLeagueXp(user, xpEarned)]);

  res.json({
    preview: false,
    xpEarned,
    firstTime,
    streakExtended: extended,
    freezeEarned,
    leveledUp: levelInfo(user.xp).level > levelBefore,
    courseCompleted,
    user,
  });
});

// Hearts are only lost on failed code challenge checks
router.post('/hearts/lose', async (req, res) => {
  if (req.user.role === 'admin') return res.json({ user: req.user });
  await User.updateOne({ _id: req.user._id, 'hearts.count': { $gt: 0 } }, { $inc: { 'hearts.count': -1 } });
  res.json({ user: await User.findById(req.user._id) });
});

// A practice round: quiz exercises (no code challenges) from lessons the student has unlocked
router.get('/practice', async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const enrollments = isAdmin ? [] : await Enrollment.find({ user: req.user._id }).populate('cohort', 'startDate');
  const startedCourseIds = enrollments.filter((e) => !e.cohort || e.cohort.startDate <= new Date()).map((e) => e.course);
  const courses = await Course.find({ status: 'published', ...(!isAdmin && { _id: { $in: startedCourseIds } }) });

  const pool = [];
  for (const course of courses) {
    const lessons = orderedLessons(course, await Lesson.find({ course: course._id }).sort('order'));
    const completedIds = enrollments.find((e) => e.course.equals(course._id))?.completedLessons ?? [];
    const states = lessonStates(lessons, completedIds, isAdmin);
    for (const lesson of lessons) {
      if (states.get(String(lesson._id)) === 'locked') continue;
      pool.push(...lesson.exercises.filter((ex) => ex.type !== 'code_challenge'));
    }
  }

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  res.json({ exercises: pool.slice(0, PRACTICE_SIZE) });
});

router.post('/practice/complete', async (req, res) => {
  req.user.hearts.count = MAX_HEARTS;
  req.user.hearts.refilledAt = new Date();
  await req.user.save();
  res.json({ user: req.user });
});

// This week's league group
router.get('/league', async (req, res) => {
  await closeFinishedWeeks();
  const user = await User.findById(req.user._id); // tier may have just changed
  const week = currentWeek();
  const base = { week, endsAt: weekEndsAt(week), tier: user.league.tier };

  const mine = await LeagueMembership.findOne({ user: user._id, week });
  if (!mine) return res.json({ ...base, joined: false, members: [] });

  const group = await sortedGroup(week, mine.groupId).populate('user', 'name');
  res.json({
    ...base,
    tier: mine.tier,
    joined: true,
    members: group.map((m, index) => ({
      _id: m.user?._id,
      name: m.user?.name ?? 'Former student',
      xp: m.xp,
      rank: index + 1,
      zone: zoneFor(index, group.length, m),
      isMe: m.user?._id.equals(user._id) ?? false,
    })),
  });
});

router.get('/profile', async (req, res) => {
  const enrollments = await Enrollment.find({ user: req.user._id }).select('completedLessons completedAt');
  const stats = {
    xp: req.user.xp,
    lessonsCompleted: enrollments.reduce((sum, e) => sum + e.completedLessons.length, 0),
    coursesCompleted: enrollments.filter((e) => e.completedAt).length,
    longestStreak: req.user.streak.longest,
    highestTier: req.user.league.highestTier,
  };
  res.json({
    stats,
    badges: BADGES.map(({ key, title, description, earned }) => ({ key, title, description, earned: earned(stats) })),
  });
});

router.post('/notices/:noticeId/dismiss', async (req, res) => {
  req.user.notices.pull(req.params.noticeId);
  await req.user.save();
  res.json({ user: req.user });
});

export default router;
