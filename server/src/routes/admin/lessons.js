import { Router } from 'express';
import Course from '../../models/Course.js';
import Enrollment from '../../models/Enrollment.js';
import Lesson from '../../models/Lesson.js';
import { HttpError } from '../../utils/httpError.js';
import { lessonInput } from '../../utils/schemas.js';

const router = Router();

async function loadLesson(id) {
  const lesson = await Lesson.findById(id);
  if (!lesson) throw new HttpError(404, 'Lesson not found');
  return lesson;
}

router.get('/:id', async (req, res) => {
  const lesson = await loadLesson(req.params.id);
  const course = await Course.findById(lesson.course).select('title modules');
  const mod = course?.modules.id(lesson.moduleId);
  res.json({
    lesson,
    course: course && { _id: course._id, title: course.title },
    module: mod && { _id: mod._id, title: mod.title },
  });
});

// Replaces the whole lesson (the editor always sends every field)
router.put('/:id', async (req, res) => {
  const lesson = await loadLesson(req.params.id);
  lesson.set(lessonInput.parse(req.body));
  await lesson.save();
  res.json({ lesson });
});

router.delete('/:id', async (req, res) => {
  const lesson = await loadLesson(req.params.id);
  await lesson.deleteOne();
  await Enrollment.updateMany({ course: lesson.course }, { $pull: { completedLessons: lesson._id } });

  const siblings = await Lesson.find({ course: lesson.course, moduleId: lesson.moduleId }).sort('order').select('_id');
  if (siblings.length) {
    await Lesson.bulkWrite(siblings.map((l, index) => ({ updateOne: { filter: { _id: l._id }, update: { order: index } } })));
  }
  res.status(204).end();
});

export default router;
