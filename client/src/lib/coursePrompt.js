// The prompt admins paste into claude.ai so Claude replies with a course in Codelings' import format.

const EXAMPLE = {
  title: 'CSS Basics',
  description: 'Style your first web pages with colours, fonts and spacing.',
  emoji: '🎨',
  color: '#EC4899',
  modules: [
    {
      title: 'Selectors and colours',
      lessons: [
        {
          title: 'Your first CSS rule',
          reading: 'A CSS **rule** has a *selector* and *declarations*:\n\n```css\nh1 { color: purple; }\n```',
          videoUrl: '',
          xp: 10,
          exercises: [
            {
              type: 'mcq',
              prompt: 'Which part of `h1 { color: red; }` is the selector?',
              options: ['h1', 'color', 'red'],
              correctIndex: 0,
              explanation: 'The selector picks which elements the rule applies to.',
            },
            {
              type: 'fill_blank',
              prompt: 'Make every paragraph blue',
              text: 'p { ___: blue; }',
              answers: ['color'],
              explanation: '',
            },
            {
              type: 'order_code',
              prompt: 'Put this rule in the right order',
              lines: ['h1 {', '  color: green;', '}'],
              explanation: '',
            },
            {
              type: 'code_challenge',
              prompt: 'Make the heading text purple using CSS.',
              starter: { html: '<h1>Hello</h1>', css: '/* your CSS here */\n', js: '' },
              tests: [
                {
                  label: 'The heading is purple',
                  check: "getComputedStyle(document.querySelector('h1')).color === 'rgb(128, 0, 128)'",
                },
              ],
              explanation: '',
            },
          ],
        },
      ],
    },
  ],
};

export function buildCoursePrompt({ topic, audience, moduleCount, lessonsPerModule }) {
  return `You are writing a course for Codelings, a gamified app that teaches coding with short lessons and quick exercises (like a language-learning app, but for code).

COURSE REQUEST
${topic.trim()}
Audience: ${audience}
Size: ${moduleCount} modules with about ${lessonsPerModule} lessons each.

Reply with ONLY a single JSON object (no explanation before or after) in exactly this shape:

${JSON.stringify(EXAMPLE, null, 2)}

RULES
- Lessons are bite-sized: a short "reading" (Markdown, under 150 words, with a tiny code example) and 3–6 exercises. Mix the exercise types; end most lessons with something hands-on.
- Build up gradually: each lesson should only use ideas taught in earlier lessons.
- Leave "videoUrl" as "" (the teacher adds their own videos). Use "xp" between 10 and 20.
- "mcq": 2–4 "options"; "correctIndex" is the 0-based index of the right option. Make wrong options plausible.
- "fill_blank": mark each blank in "text" with ___ (three underscores) and give exactly one entry in "answers" per blank, in order. Answers are checked case-insensitively, so use one clear answer.
- "order_code": "lines" are 3–8 lines of code in the CORRECT order (the app shuffles them). Avoid duplicate lines.
- "code_challenge": runs in the browser only, using HTML, CSS and plain JavaScript (no libraries, no Node.js). "starter" has "html", "css" and "js" strings. Each test "check" is a single JavaScript expression that is true when the task is done, evaluated in the student's page after it loads (e.g. document.querySelector, getComputedStyle, or variables/functions the student defines with var or function). Checks must be synchronous. Give each test a short, friendly "label" the student sees as a goal.
- "explanation" is optional feedback shown after answering ("" if none).
- "emoji" is one emoji for the course. "color" must be one of: #6D4AFF, #22C55E, #0EA5E9, #F97316, #EC4899, #EAB308, #14B8A6, #EF4444.
- Use valid JSON: double quotes, no comments, no trailing commas, escape newlines inside strings as \\n.`;
}

/** Pulls the JSON object out of Claude's reply (which may be wrapped in a ``` block or text). */
export function extractCourseJson(reply) {
  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error("Couldn't find a JSON object in the pasted text.");
  try {
    return JSON.parse(reply.slice(start, end + 1));
  } catch (err) {
    throw new Error(`The pasted text isn't valid JSON (${err.message}). Ask Claude to "return only valid JSON" and paste again.`);
  }
}

/** Turns a validation path like ['modules', 0, 'lessons', 2, 'exercises', 1, 'options'] into readable text. */
export function describeImportIssue({ path, message }) {
  const parts = [];
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    const index = path[i + 1];
    if (typeof index === 'number' && ['modules', 'lessons', 'exercises', 'tests'].includes(key)) {
      parts.push(`${{ modules: 'Module', lessons: 'Lesson', exercises: 'Exercise', tests: 'Check' }[key]} ${index + 1}`);
      i++;
    } else if (typeof key === 'string') {
      parts.push(key);
    }
  }
  return parts.length ? `${parts.join(' › ')}: ${message}` : message;
}
