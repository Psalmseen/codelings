import { ArrowDown, ArrowDownUp, ArrowUp, Code2, ListChecks, Plus, TextCursorInput, Trash2, X } from 'lucide-react';
import { ConfirmButton } from '../ui';

export const EXERCISE_TYPES = {
  mcq: { label: 'Multiple choice', icon: ListChecks, tint: 'bg-sky-400/15 text-sky-300' },
  fill_blank: { label: 'Fill in the blank', icon: TextCursorInput, tint: 'bg-lime-400/15 text-lime-300' },
  order_code: { label: 'Arrange the code', icon: ArrowDownUp, tint: 'bg-orange-400/15 text-orange-300' },
  code_challenge: { label: 'Code challenge', icon: Code2, tint: 'bg-neon-500/20 text-neon-300' },
};

export function newExercise(type) {
  const key = crypto.randomUUID();
  switch (type) {
    case 'mcq':
      return { key, type, prompt: '', options: ['', ''], correctIndex: 0, explanation: '' };
    case 'fill_blank':
      return { key, type, prompt: 'Fill in the blank', text: '', answers: [], explanation: '' };
    case 'order_code':
      return { key, type, prompt: 'Put the lines in the right order', lines: ['', ''], explanation: '' };
    case 'code_challenge':
      return { key, type, prompt: '', starter: { html: '', css: '', js: '' }, tests: [{ label: '', check: '' }], explanation: '' };
    default:
      throw new Error(`Unknown exercise type ${type}`);
  }
}

const replaceAt = (list, index, value) => list.map((item, i) => (i === index ? value : item));
const removeAt = (list, index) => list.filter((_, i) => i !== index);
const countBlanks = (text) => text.split('___').length - 1;

function McqFields({ exercise, update }) {
  const { options, correctIndex } = exercise;
  return (
    <div>
      <span className="label">Options (select the correct one)</span>
      <div className="space-y-2">
        {options.map((option, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              className="size-5 shrink-0 accent-lime-500"
              checked={correctIndex === i}
              onChange={() => update({ correctIndex: i })}
              aria-label={`Mark option ${i + 1} correct`}
            />
            <input
              className={`input py-2.5 ${correctIndex === i ? 'border-lime-400 bg-lime-400/10' : ''}`}
              placeholder={`Option ${i + 1}`}
              value={option}
              onChange={(e) => update({ options: replaceAt(options, i, e.target.value) })}
            />
            <button
              type="button"
              className="icon-btn"
              disabled={options.length <= 2}
              aria-label="Remove option"
              onClick={() =>
                update({
                  options: removeAt(options, i),
                  correctIndex: correctIndex === i ? 0 : correctIndex > i ? correctIndex - 1 : correctIndex,
                })
              }
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
      {options.length < 6 && (
        <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => update({ options: [...options, ''] })}>
          <Plus className="size-4" /> Add option
        </button>
      )}
    </div>
  );
}

function FillBlankFields({ exercise, update }) {
  const { text, answers } = exercise;
  const setText = (value) => {
    const blanks = countBlanks(value);
    update({ text: value, answers: Array.from({ length: blanks }, (_, i) => answers[i] ?? '') });
  };

  return (
    <>
      <div>
        <label className="label">Sentence or code (type ___ for each blank)</label>
        <textarea rows={3} className="input-code" placeholder="const name = ___;" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      {answers.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {answers.map((answer, i) => (
            <div key={i}>
              <label className="label">Blank {i + 1} answer (not case-sensitive)</label>
              <input className="input-code py-2.5" value={answer} onChange={(e) => update({ answers: replaceAt(answers, i, e.target.value) })} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm font-bold text-orange-400">Add at least one ___ blank.</p>
      )}
    </>
  );
}

function OrderCodeFields({ exercise, update }) {
  const { lines } = exercise;
  return (
    <div>
      <span className="label">Lines in the correct order (students see them shuffled)</span>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-right font-mono text-sm font-bold text-slate-400">{i + 1}</span>
            <input className="input-code py-2.5" value={line} onChange={(e) => update({ lines: replaceAt(lines, i, e.target.value) })} />
            <button type="button" className="icon-btn" disabled={lines.length <= 2} onClick={() => update({ lines: removeAt(lines, i) })} aria-label="Remove line">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => update({ lines: [...lines, ''] })}>
        <Plus className="size-4" /> Add line
      </button>
    </div>
  );
}

function CodeChallengeFields({ exercise, update }) {
  const { starter, tests } = exercise;
  return (
    <>
      <div className="grid gap-3 lg:grid-cols-3">
        {['html', 'css', 'js'].map((lang) => (
          <div key={lang}>
            <label className="label uppercase">Starter {lang}</label>
            <textarea
              rows={5}
              spellCheck={false}
              className="input-code"
              value={starter[lang]}
              onChange={(e) => update({ starter: { ...starter, [lang]: e.target.value } })}
            />
          </div>
        ))}
      </div>
      <div>
        <span className="label">Checks (all must pass)</span>
        <p className="mb-2 text-xs font-semibold text-slate-400">
          Each check is a JavaScript expression that's true when the task is done, run against the student's page. Example:{' '}
          <code className="rounded bg-white/10 px-1">document.querySelector('h1')?.textContent.trim() === 'Hi'</code>
        </p>
        <div className="space-y-3">
          {tests.map((test, i) => (
            <div key={i} className="flex items-start gap-2 rounded-2xl bg-white/[0.03] p-3">
              <div className="flex-1 space-y-2">
                <input
                  className="input py-2.5"
                  placeholder="What students see, e.g. Page has a heading"
                  value={test.label}
                  onChange={(e) => update({ tests: replaceAt(tests, i, { ...test, label: e.target.value }) })}
                />
                <input
                  className="input-code py-2.5"
                  placeholder="document.querySelector('h1') !== null"
                  value={test.check}
                  onChange={(e) => update({ tests: replaceAt(tests, i, { ...test, check: e.target.value }) })}
                />
              </div>
              <button type="button" className="icon-btn" disabled={tests.length <= 1} onClick={() => update({ tests: removeAt(tests, i) })} aria-label="Remove check">
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => update({ tests: [...tests, { label: '', check: '' }] })}>
          <Plus className="size-4" /> Add check
        </button>
      </div>
    </>
  );
}

const FIELDS = { mcq: McqFields, fill_blank: FillBlankFields, order_code: OrderCodeFields, code_challenge: CodeChallengeFields };

export function ExerciseCard({ exercise, index, isLast, onChange, onMove, onRemove }) {
  const meta = EXERCISE_TYPES[exercise.type];
  const Fields = FIELDS[exercise.type];
  const update = (patch) => onChange({ ...exercise, ...patch });

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <span className={`flex size-9 items-center justify-center rounded-xl ${meta.tint}`}>
          <meta.icon className="size-5" />
        </span>
        <p className="flex-1 font-black">
          {index + 1}. {meta.label}
        </p>
        <button type="button" className="icon-btn" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move up">
          <ArrowUp className="size-5" />
        </button>
        <button type="button" className="icon-btn" disabled={isLast} onClick={() => onMove(1)} aria-label="Move down">
          <ArrowDown className="size-5" />
        </button>
        <ConfirmButton title="Remove exercise" onConfirm={onRemove}>
          <Trash2 className="size-5" />
        </ConfirmButton>
      </div>

      <div>
        <label className="label">{exercise.type === 'code_challenge' ? 'Task instructions' : 'Question'}</label>
        <textarea rows={2} className="input" value={exercise.prompt} onChange={(e) => update({ prompt: e.target.value })} />
      </div>

      <Fields exercise={exercise} update={update} />

      <div>
        <label className="label">Explanation (shown after answering, optional)</label>
        <input className="input py-2.5" value={exercise.explanation ?? ''} onChange={(e) => update({ explanation: e.target.value })} />
      </div>
    </div>
  );
}
