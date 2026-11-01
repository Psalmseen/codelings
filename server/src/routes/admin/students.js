import { Router } from 'express';
import Cohort from '../../models/Cohort.js';
import Course from '../../models/Course.js';
import Enrollment from '../../models/Enrollment.js';
import User from '../../models/User.js';
import { countLessons } from '../../services/stats.js';
import { HttpError } from '../../utils/httpError.js';
import { enrollInput, enrollmentCohortInput } from '../../utils/schemas.js';

const router = Router();

async function loadStudent(id) {
  const student = await User.findOne({ _id: id, role: 'student' });
  if (!student) throw new HttpError(404, 'Student not found');
  return student;
}

router.get('/', async (_req, res) => {
  const students = await User.find({ role: 'student' }).sort({ createdAt: -1 }).populate('referredBy', 'name');
  const referralCounts = new Map(
    (await User.aggregate([{ $match: { referredBy: { $ne: null } } }, { $group: { _id: '$referredBy', count: { $sum: 1 } } }])).map((r) => [String(r._id), r.count])
  );
  const enrollments = await Enrollment.find({ user: { $in: students.map((s) => s._id) } })
    .populate('course', 'title emoji pacing')
    .populate('cohort', 'name startDate')
    .lean();
  const live = enrollments.filter((e) => e.course);
  const courseIds = [...new Map(live.map((e) => [String(e.course._id), e.course._id])).values()];
  const totals = await countLessons(courseIds);

  const byStudent = new Map();
  for (const e of live) {
    const list = byStudent.get(String(e.user)) ?? [];
    list.push({
      courseId: e.course._id,
      title: e.course.title,
      emoji: e.course.emoji,
      pacing: e.course.pacing,
      cohort: e.cohort,
      completed: e.completedLessons.length,
      total: totals.get(String(e.course._id)) ?? 0,
    });
    byStudent.set(String(e.user), list);
  }

  res.json({
    students: students.map((s) => ({ ...s.toJSON(), referrals: referralCounts.get(String(s._id)) ?? 0, enrollments: byStudent.get(String(s._id)) ?? [] })),
  });
});

router.post('/:id/enrollments', async (req, res) => {
  const student = await loadStudent(req.params.id);
  const { courseId, cohortId = null } = enrollInput.parse(req.body);
  if (!(await Course.exists({ _id: courseId }))) throw new HttpError(404, 'Course not found');
  if (cohortId) await assertCohortOfCourse(cohortId, courseId);
  await Enrollment.updateOne(
    { user: student._id, course: courseId },
    { $setOnInsert: { user: student._id, course: courseId, cohort: cohortId } },
    { upsert: true }
  );
  res.status(201).json({ ok: true });
});

async function assertCohortOfCourse(cohortId, courseId) {
  if (!(await Cohort.exists({ _id: cohortId, course: courseId }))) throw new HttpError(400, "That cohort isn't part of this course");
}

router.patch('/:id/enrollments/:courseId', async (req, res) => {
  const student = await loadStudent(req.params.id);
  const { cohortId } = enrollmentCohortInput.parse(req.body);
  if (cohortId) await assertCohortOfCourse(cohortId, req.params.courseId);
  const { matchedCount } = await Enrollment.updateOne({ user: student._id, course: req.params.courseId }, { cohort: cohortId });
  if (!matchedCount) throw new HttpError(404, 'Enrollment not found');
  res.json({ ok: true });
});

router.delete('/:id/enrollments/:courseId', async (req, res) => {
  const student = await loadStudent(req.params.id);
  await Enrollment.deleteOne({ user: student._id, course: req.params.courseId });
  res.status(204).end();
});

export default router;
