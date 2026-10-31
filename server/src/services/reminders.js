import { clientUrl } from '../config/env.js';
// Registered here because enrollments are populated with them
import '../models/Cohort.js';
import '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Lesson from '../models/Lesson.js';
import User from '../models/User.js';
import { sendMail, streakReminderEmail } from './mail.js';
import { nextLesson, orderedLessons } from './progress.js';
import { countLessons } from './stats.js';
import { localDate, refreshStreak } from './streak.js';

export const REMINDER_HOUR = 19; // 7pm in the student's timezone
export const AT_RISK_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

function localHour(timezone, date) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', hourCycle: 'h23' }).format(date));
}

const isStarted = (enrollment, now) => !enrollment.cohort || enrollment.cohort.startDate <= now;

/** Live, started enrollments for a user, most recently active first, each with its next lesson. */
export async function pendingCourses(userId, now = new Date()) {
  const enrollments = await Enrollment.find({ user: userId })
    .populate('course', 'title emoji color status modules')
    .populate('cohort', 'name startDate')
    .sort({ lastActivityAt: -1, createdAt: -1 });
  const live = enrollments.filter((e) => e.course?.status === 'published' && isStarted(e, now));

  const lessons = await Lesson.find({ course: { $in: live.map((e) => e.course._id) } })
    .select('title moduleId order course')
    .sort('order');
  return live
    .map((enrollment) => {
      const ordered = orderedLessons(
        enrollment.course,
        lessons.filter((l) => l.course.equals(enrollment.course._id))
      );
      return { enrollment, next: nextLesson(ordered, enrollment.completedLessons) };
    })
    .filter(({ next }) => next);
}

/**
 * Emails students whose streak ends tonight: it's 7pm for them, they haven't done a lesson
 * today and they still have a lesson to do. At most one email per student per day.
 */
export async function sendStreakReminders(now = new Date()) {
  const students = await User.find({ role: 'student', emailReminders: true, 'streak.current': { $gt: 0 } });
  let sent = 0;

  for (const user of students) {
    try {
      if (localHour(user.timezone, now) !== REMINDER_HOUR) continue;
      const today = localDate(user.timezone, now);
      if (user.lastReminderOn === today) continue;

      // Apply missed days first so we don't nag about a streak that's already gone
      const changed = refreshStreak(user, now);
      const atRisk = user.streak.current > 0 && user.streak.lastActiveOn !== today;
      const [pending] = atRisk ? await pendingCourses(user._id, now) : [];
      if (!pending) {
        if (changed) await user.save();
        continue;
      }

      const delivered = await sendMail(
        streakReminderEmail({
          to: user.email,
          name: user.name,
          streak: user.streak.current,
          freezes: user.streak.freezes,
          courseTitle: pending.enrollment.course.title,
          lessonTitle: pending.next.title,
          link: `${clientUrl}/learn/courses/${pending.enrollment.course._id}`,
          settingsLink: `${clientUrl}/learn/profile`,
        })
      );
      if (delivered) {
        user.lastReminderOn = today;
        sent++;
      }
      await user.save();
    } catch (err) {
      console.error(`[reminders] failed for ${user.email}:`, err.message);
    }
  }
  return { checked: students.length, sent };
}

/**
 * Students with an unfinished course who haven't done a lesson in AT_RISK_DAYS days
 * (or never started), longest-inactive first.
 */
export async function studentsAtRisk(now = new Date()) {
  const cutoff = new Date(now.getTime() - AT_RISK_DAYS * DAY_MS);
  const students = await User.find({ role: 'student' });
  const enrollments = await Enrollment.find({ user: { $in: students.map((s) => s._id) } })
    .populate('course', 'title emoji status')
    .populate('cohort', 'startDate');
  const totals = await countLessons([...new Set(enrollments.filter((e) => e.course).map((e) => e.course._id))]);

  const atRisk = [];
  for (const student of students) {
    const mine = enrollments.filter((e) => e.user.equals(student._id) && e.course);
    const unfinished = mine.filter(
      (e) => e.course.status === 'published' && isStarted(e, now) && e.completedLessons.length < (totals.get(String(e.course._id)) ?? 0)
    );
    if (unfinished.length === 0) continue;

    const lastActivity = mine.reduce((latest, e) => (e.lastActivityAt > latest ? e.lastActivityAt : latest), null);
    // Never-started students count from when they could first start
    const since = lastActivity ?? new Date(Math.max(...unfinished.map((e) => Math.max(e.createdAt, e.cohort?.startDate ?? 0))));
    if (since > cutoff) continue;

    const focus = unfinished.sort((a, b) => (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0))[0];
    atRisk.push({
      _id: student._id,
      name: student.name,
      email: student.email,
      neverStarted: !lastActivity,
      daysInactive: Math.floor((now - since) / DAY_MS),
      streakLongest: student.streak.longest,
      course: {
        _id: focus.course._id,
        title: focus.course.title,
        emoji: focus.course.emoji,
        completed: focus.completedLessons.length,
        total: totals.get(String(focus.course._id)) ?? 0,
      },
    });
  }
  return atRisk.sort((a, b) => b.daysInactive - a.daysInactive);
}
