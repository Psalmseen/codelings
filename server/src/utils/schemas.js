import { z } from 'zod';

const text = z.string().trim();
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const email = z.string().trim().toLowerCase().email('Enter a valid email');

export const loginInput = z.object({ email, password: z.string().min(1, 'Enter your password') });

export const registerInput = z.object({
  code: text.min(1),
  name: text.min(1, 'Enter your name').max(60),
  email,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  timezone: z.string().optional(),
});

export const profileInput = z.object({
  name: text.min(1).max(60).optional(),
  emailReminders: z.boolean().optional(),
  timezone: z.string().optional(),
});

export const courseInput = z.object({
  title: text.min(1, 'Give the course a title').max(120),
  description: text.max(2000).optional(),
  emoji: text.max(8).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Pick a colour').optional(),
  pacing: z.enum(['self', 'cohort']).optional(),
  status: z.enum(['draft', 'published']).optional(),
});

export const moduleInput = z.object({
  title: text.min(1, 'Give the module a title').max(120),
  description: text.max(1000).optional(),
});

export const titleInput = z.object({ title: text.min(1, 'Give it a title').max(120) });
export const orderInput = z.object({ order: z.array(objectId) });

const exerciseBase = {
  _id: objectId.optional(),
  prompt: text.min(1, 'Every exercise needs a question or instruction'),
  explanation: text.max(2000).default(''),
};

const nonBlankLine = z.string().refine((line) => line.trim().length > 0, 'Code lines cannot be empty');

/** True if `code` parses as a JavaScript expression. Only compiles it, never runs it. */
function isExpression(code) {
  try {
    new Function(`return (${code});`);
    return true;
  } catch {
    return false;
  }
}

export const exerciseInput = z.discriminatedUnion('type', [
  z
    .object({
      ...exerciseBase,
      type: z.literal('mcq'),
      options: z.array(text.min(1, 'Options cannot be empty')).min(2, 'Add at least 2 options').max(6),
      correctIndex: z.number().int().min(0),
    })
    .refine((ex) => ex.correctIndex < ex.options.length, { message: 'Pick the correct option (it must point to one of the options)', path: ['correctIndex'] }),
  z
    .object({
      ...exerciseBase,
      type: z.literal('fill_blank'),
      text: text.min(1, 'Write the sentence or code with blanks').refine((t) => t.includes('___'), 'Use ___ to mark each blank'),
      answers: z.array(text.min(1, 'Every blank needs an answer')).min(1, 'Add an answer for each blank'),
    })
    .refine((ex) => ex.text.split('___').length - 1 === ex.answers.length, {
      message: 'Each blank needs exactly one answer',
      path: ['answers'],
    }),
  z.object({
    ...exerciseBase,
    type: z.literal('order_code'),
    lines: z.array(nonBlankLine).min(2, 'Add at least 2 lines of code'),
  }),
  z.object({
    ...exerciseBase,
    type: z.literal('code_challenge'),
    starter: z.object({ html: z.string().default(''), css: z.string().default(''), js: z.string().default('') }),
    tests: z
      .array(
        z.object({
          label: text.min(1, 'Each check needs a description'),
          check: text.min(1, 'Each check needs code').refine(isExpression, "This check isn't a valid JavaScript expression"),
        })
      )
      .min(1, 'Add at least 1 check'),
  }),
]);

export const lessonInput = z.object({
  title: text.min(1, 'Give the lesson a title').max(120),
  videoUrl: z.union([z.literal(''), z.string().trim().url('Video link must be a valid URL')]).default(''),
  reading: z.string().max(20000).default(''),
  xp: z.number().int().min(1).max(100).default(10),
  exercises: z.array(exerciseInput).max(30, 'Keep lessons to 30 exercises or fewer').default([]),
});

// A whole course in one go (from the "Import course" screen). Cosmetic fields fall back to defaults.
export const courseImportInput = z.object({
  title: text.min(1, 'The course needs a title').max(120),
  description: text.max(2000).catch(''),
  emoji: text.min(1).max(8).optional().catch(undefined),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional().catch(undefined),
  pacing: z.enum(['self', 'cohort']).optional().catch(undefined),
  modules: z
    .array(
      z.object({
        title: text.min(1, 'Every module needs a title').max(120),
        description: text.max(1000).catch(''),
        lessons: z.array(lessonInput).min(1, 'Every module needs at least one lesson').max(50),
      })
    )
    .min(1, 'The course needs at least one module')
    .max(30),
});

export const cohortInput = z.object({
  name: text.min(1, 'Give the cohort a name').max(80),
  startDate: z.coerce.date({ message: 'Pick a start date' }),
});

export const inviteInput = z.object({
  name: text.max(60).default(''),
  email: z.union([z.literal(''), email]).default(''),
  courseIds: z.array(objectId).default([]),
  cohortIds: z.array(objectId).default([]),
  expiresInDays: z.number().int().min(1).max(90).default(14),
  sendEmail: z.boolean().default(false),
});

export const enrollInput = z.object({ courseId: objectId, cohortId: objectId.nullable().optional() });
export const enrollmentCohortInput = z.object({ cohortId: objectId.nullable() });
