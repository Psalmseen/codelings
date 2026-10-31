// Answer state and checking for the quiz-style exercises (code challenges check themselves).

export function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const normalize = (value) => value.trim().replace(/\s+/g, ' ').toLowerCase();
export const countBlanks = (text) => text.split('___').length - 1;

export function initialValue(exercise) {
  switch (exercise.type) {
    case 'mcq':
      return null;
    case 'fill_blank':
      return Array(countBlanks(exercise.text)).fill('');
    case 'order_code': {
      const indices = exercise.lines.map((_, i) => i);
      const correct = exercise.lines.join('\n');
      // Avoid handing out the answer: reshuffle if it came out already in order
      let pool = shuffle(indices);
      for (let tries = 0; tries < 5 && pool.map((i) => exercise.lines[i]).join('\n') === correct; tries++) pool = shuffle(indices);
      return { pool, picked: [] };
    }
    case 'code_challenge':
      return { html: exercise.starter?.html ?? '', css: exercise.starter?.css ?? '', js: exercise.starter?.js ?? '' };
    default:
      return null;
  }
}

export function isReady(exercise, value) {
  switch (exercise.type) {
    case 'mcq':
      return value !== null;
    case 'fill_blank':
      return value.every((answer) => answer.trim() !== '');
    case 'order_code':
      return value.picked.length === exercise.lines.length;
    default:
      return true;
  }
}

export function isCorrect(exercise, value) {
  switch (exercise.type) {
    case 'mcq':
      return value === exercise.correctIndex;
    case 'fill_blank':
      return exercise.answers.every((answer, i) => normalize(answer) === normalize(value[i] ?? ''));
    case 'order_code':
      // Compare text, not indices, so duplicate lines (e.g. two "}") can go either way
      return value.picked.map((i) => exercise.lines[i]).join('\n') === exercise.lines.join('\n');
    default:
      return false;
  }
}

export function correctAnswer(exercise) {
  switch (exercise.type) {
    case 'mcq':
      return exercise.options[exercise.correctIndex];
    case 'fill_blank':
      return exercise.answers.join(', ');
    case 'order_code':
      return exercise.lines.join('\n');
    default:
      return '';
  }
}
