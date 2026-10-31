/** Lessons in path order: module order first, then lesson order (lessons must be pre-sorted by `order`). */
export function orderedLessons(course, lessons) {
  return course.modules.flatMap((mod) => lessons.filter((lesson) => lesson.moduleId.equals(mod._id)));
}

/** First lesson in path order that isn't completed, or null when the course is finished. */
export function nextLesson(ordered, completedIds) {
  const done = new Set(completedIds.map(String));
  return ordered.find((lesson) => !done.has(String(lesson._id))) ?? null;
}

/**
 * Maps lesson id -> 'completed' | 'available' | 'locked'. Students unlock lessons one at a
 * time in path order; admins (previewing) see everything available.
 */
export function lessonStates(ordered, completedIds, isAdmin = false) {
  const done = new Set(completedIds.map(String));
  let currentFound = false;
  return new Map(
    ordered.map((lesson) => {
      let state = 'locked';
      if (isAdmin) state = 'available';
      else if (done.has(String(lesson._id))) state = 'completed';
      else if (!currentFound) {
        state = 'available';
        currentFound = true;
      }
      return [String(lesson._id), state];
    })
  );
}
