import Enrollment from '../models/Enrollment.js';
import Lesson from '../models/Lesson.js';

async function countByCourse(model, courseIds) {
  const rows = await model.aggregate([
    { $match: { course: { $in: courseIds } } },
    { $group: { _id: '$course', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

export const countLessons = (courseIds) => countByCourse(Lesson, courseIds);
export const countEnrollments = (courseIds) => countByCourse(Enrollment, courseIds);

/** Lesson summaries (no exercise bodies) for a course, ordered within each module. */
export function lessonSummaries(courseId) {
  return Lesson.aggregate([
    { $match: { course: courseId } },
    {
      $project: {
        title: 1,
        moduleId: 1,
        order: 1,
        xp: 1,
        exerciseCount: { $size: '$exercises' },
        hasVideo: { $gt: [{ $strLenCP: { $ifNull: ['$videoUrl', ''] } }, 0] },
      },
    },
    { $sort: { order: 1 } },
  ]);
}
