import { Router } from 'express';
import Cohort from '../../models/Cohort.js';
import Course from '../../models/Course.js';
import Enrollment from '../../models/Enrollment.js';
import Invite from '../../models/Invite.js';
import Lesson from '../../models/Lesson.js';
import { countEnrollments, countLessons, lessonSummaries } from '../../services/stats.js';
import { HttpError } from '../../utils/httpError.js';
import { cohortInput, courseImportInput, courseInput, moduleInput, orderInput, titleInput } from '../../utils/schemas.js';

const router = Router();

async function loadCourse(id) {
  const course = await Course.findById(id);
  if (!course) throw new HttpError(404, 'Course not found');
  return course;
}

function loadModule(course, moduleId) {
  const mod = course.modules.id(moduleId);
  if (!mod) throw new HttpError(404, 'Module not found');
  return mod;
}

async function cohortsWithCounts(courseId) {
  const [cohorts, counts] = await Promise.all([
    Cohort.find({ course: courseId }).sort({ startDate: 1 }).lean(),
    Enrollment.aggregate([{ $match: { course: courseId, cohort: { $ne: null } } }, { $group: { _id: '$cohort', count: { $sum: 1 } } }]),
  ]);
  const byCohort = new Map(counts.map((c) => [String(c._id), c.count]));
  return cohorts.map((c) => ({ ...c, studentCount: byCohort.get(String(c._id)) ?? 0 }));
}

/** Course with each module's lesson summaries (and cohorts) attached — the shape the builder UI uses. */
async function builderView(course) {
  const [lessons, cohorts] = await Promise.all([lessonSummaries(course._id), cohortsWithCounts(course._id)]);
  return {
    course: {
      ...course.toJSON(),
      cohorts,
      modules: course.modules.map((mod) => ({
        ...mod.toJSON(),
        lessons: lessons.filter((lesson) => lesson.moduleId.equals(mod._id)),
      })),
    },
  };
}

const sameIds = (a, b) => a.length === b.length && a.every((id) => b.includes(id));

router.get('/', async (_req, res) => {
  const courses = await Course.find().sort({ updatedAt: -1 }).lean();
  const ids = courses.map((c) => c._id);
  const [lessons, students, cohorts] = await Promise.all([
    countLessons(ids),
    countEnrollments(ids),
    Cohort.find({ course: { $in: ids } }).sort({ startDate: 1 }).select('course name startDate').lean(),
  ]);
  res.json({
    courses: courses.map(({ modules, ...course }) => ({
      ...course,
      cohorts: cohorts.filter((c) => c.course.equals(course._id)),
      moduleCount: modules.length,
      lessonCount: lessons.get(String(course._id)) ?? 0,
      studentCount: students.get(String(course._id)) ?? 0,
    })),
  });
});

router.post('/', async (req, res) => {
  const input = courseInput.parse(req.body);
  const course = await Course.create({ ...input, createdBy: req.user._id });
  res.status(201).json(await builderView(course));
});

// Creates a draft course with all its modules and lessons. With ?dryRun=1 it only validates
// and returns a summary for the preview.
router.post('/import', async (req, res) => {
  const input = courseImportInput.parse(req.body);
  const summary = {
    title: input.title,
    emoji: input.emoji,
    modules: input.modules.map((mod) => ({
      title: mod.title,
      lessons: mod.lessons.map((lesson) => ({ title: lesson.title, exerciseTypes: lesson.exercises.map((ex) => ex.type) })),
    })),
  };
  if (req.query.dryRun) return res.json({ summary });

  const { modules, ...fields } = input;
  const course = await Course.create({
    ...fields,
    status: 'draft',
    modules: modules.map(({ title, description }) => ({ title, description })),
    createdBy: req.user._id,
  });
  try {
    await Lesson.insertMany(
      modules.flatMap((mod, i) => mod.lessons.map((lesson, order) => ({ ...lesson, course: course._id, moduleId: course.modules[i]._id, order })))
    );
  } catch (err) {
    await course.deleteOne();
    throw err;
  }
  res.status(201).json({ ...(await builderView(course)), summary });
});

router.get('/:id', async (req, res) => {
  res.json(await builderView(await loadCourse(req.params.id)));
});

router.patch('/:id', async (req, res) => {
  const course = await loadCourse(req.params.id);
  course.set(courseInput.partial().parse(req.body));
  await course.save();
  res.json(await builderView(course));
});

router.delete('/:id', async (req, res) => {
  const course = await loadCourse(req.params.id);
  await Promise.all([
    Lesson.deleteMany({ course: course._id }),
    Enrollment.deleteMany({ course: course._id }),
    Invite.updateMany({ courses: course._id }, { $pull: { courses: course._id } }),
    Cohort.find({ course: course._id }).then((cohorts) =>
      Promise.all([
        Invite.updateMany({}, { $pullAll: { cohorts: cohorts.map((c) => c._id) } }),
        Cohort.deleteMany({ course: course._id }),
      ])
    ),
  ]);
  await course.deleteOne();
  res.status(204).end();
});

// --- Modules ---

router.post('/:id/modules', async (req, res) => {
  const course = await loadCourse(req.params.id);
  course.modules.push(moduleInput.parse(req.body));
  await course.save();
  res.status(201).json(await builderView(course));
});

router.put('/:id/modules/order', async (req, res) => {
  const course = await loadCourse(req.params.id);
  const { order } = orderInput.parse(req.body);
  if (!sameIds(order, course.modules.map((m) => String(m._id)))) {
    throw new HttpError(400, 'Order must list every module exactly once');
  }
  course.modules = order.map((id) => course.modules.id(id).toObject());
  await course.save();
  res.json(await builderView(course));
});

router.patch('/:id/modules/:moduleId', async (req, res) => {
  const course = await loadCourse(req.params.id);
  loadModule(course, req.params.moduleId).set(moduleInput.partial().parse(req.body));
  await course.save();
  res.json(await builderView(course));
});

router.delete('/:id/modules/:moduleId', async (req, res) => {
  const course = await loadCourse(req.params.id);
  const mod = loadModule(course, req.params.moduleId);
  const lessonIds = (await Lesson.find({ course: course._id, moduleId: mod._id }).select('_id')).map((l) => l._id);
  await Promise.all([
    Lesson.deleteMany({ _id: { $in: lessonIds } }),
    Enrollment.updateMany({ course: course._id }, { $pullAll: { completedLessons: lessonIds } }),
  ]);
  mod.deleteOne();
  await course.save();
  res.json(await builderView(course));
});

// --- Cohorts ---

async function loadCohort(course, cohortId) {
  const cohort = await Cohort.findOne({ _id: cohortId, course: course._id });
  if (!cohort) throw new HttpError(404, 'Cohort not found');
  return cohort;
}

router.post('/:id/cohorts', async (req, res) => {
  const course = await loadCourse(req.params.id);
  await Cohort.create({ ...cohortInput.parse(req.body), course: course._id });
  res.status(201).json(await builderView(course));
});

router.patch('/:id/cohorts/:cohortId', async (req, res) => {
  const course = await loadCourse(req.params.id);
  const cohort = await loadCohort(course, req.params.cohortId);
  cohort.set(cohortInput.partial().parse(req.body));
  await cohort.save();
  res.json(await builderView(course));
});

router.delete('/:id/cohorts/:cohortId', async (req, res) => {
  const course = await loadCourse(req.params.id);
  const cohort = await loadCohort(course, req.params.cohortId);
  await Promise.all([
    Enrollment.updateMany({ cohort: cohort._id }, { cohort: null }),
    Invite.updateMany({ cohorts: cohort._id }, { $pull: { cohorts: cohort._id } }),
    cohort.deleteOne(),
  ]);
  res.json(await builderView(course));
});

// --- Lessons within a module ---

router.post('/:id/modules/:moduleId/lessons', async (req, res) => {
  const course = await loadCourse(req.params.id);
  const mod = loadModule(course, req.params.moduleId);
  const { title } = titleInput.parse(req.body);
  const order = await Lesson.countDocuments({ course: course._id, moduleId: mod._id });
  const lesson = await Lesson.create({ course: course._id, moduleId: mod._id, title, order });
  await course.updateOne({ updatedAt: new Date() });
  res.status(201).json({ ...(await builderView(course)), lessonId: lesson._id });
});

router.put('/:id/modules/:moduleId/lessons/order', async (req, res) => {
  const course = await loadCourse(req.params.id);
  const mod = loadModule(course, req.params.moduleId);
  const { order } = orderInput.parse(req.body);
  const existing = await Lesson.find({ course: course._id, moduleId: mod._id }).select('_id');
  if (!sameIds(order, existing.map((l) => String(l._id)))) {
    throw new HttpError(400, 'Order must list every lesson in the module exactly once');
  }
  await Lesson.bulkWrite(order.map((id, index) => ({ updateOne: { filter: { _id: id }, update: { order: index } } })));
  res.json(await builderView(course));
});

export default router;
