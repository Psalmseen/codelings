import { useEffect } from 'react';

const OPTION_STYLES = {
  idle: 'border-tint/10 shadow-[0_4px_0_rgb(255_255_255/0.1)] hover:bg-tint/5',
  selected: 'border-sky-400 bg-sky-400/10 text-sky-300 light:text-sky-700 shadow-[0_4px_0_var(--color-sky-400)]',
  correct: 'border-lime-500 bg-lime-400/10 text-lime-300 light:text-lime-700 shadow-[0_4px_0_var(--color-lime-500)]',
  wrong: 'border-heart-500 bg-red-500/10 text-heart-500 shadow-[0_4px_0_var(--color-heart-500)]',
};

export function McqExercise({ exercise, value, onChange, feedback, paused }) {
  const locked = feedback !== null;

  // Number keys pick options
  useEffect(() => {
    if (locked || paused) return;
    const onKey = (e) => {
      const index = Number(e.key) - 1;
      if (index >= 0 && index < exercise.options.length) onChange(index);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, paused, exercise.options.length, onChange]);

  return (
    <div className="grid gap-3">
      {exercise.options.map((option, i) => {
        let style = value === i ? 'selected' : 'idle';
        if (locked && value === i) style = feedback;
        return (
          <button
            key={i}
            disabled={locked}
            onClick={() => onChange(i)}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-lg font-bold transition active:translate-y-1 active:shadow-none disabled:cursor-default ${OPTION_STYLES[style]}`}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border-2 border-current text-sm opacity-60">{i + 1}</span>
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function FillBlankExercise({ exercise, value, onChange, feedback }) {
  const parts = exercise.text.split('___');
  const locked = feedback !== null;

  return (
    <div className="rounded-3xl border-2 border-tint/10 bg-tint/[0.03] p-5 font-mono text-lg leading-[2.6] whitespace-pre-wrap">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <input
              autoFocus={i === 0}
              disabled={locked}
              aria-label={`Blank ${i + 1}`}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={value[i]}
              onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))}
              style={{ width: `${Math.max(4, value[i].length + 1)}ch` }}
              className={`mx-0.5 rounded-lg border-b-4 bg-tint/10 px-1.5 py-0 text-center leading-normal font-bold outline-none ${
                feedback === 'correct' ? 'border-lime-500 text-lime-300 light:text-lime-700' : feedback === 'wrong' ? 'border-heart-500 text-heart-500' : 'border-sky-400 focus:border-neon-400'
              }`}
            />
          )}
        </span>
      ))}
    </div>
  );
}

function CodeTile({ line, onClick, disabled }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="cursor-pointer rounded-xl border-2 border-tint/10 bg-tint/5 px-3 py-2 text-left font-mono text-sm font-semibold whitespace-pre shadow-[0_3px_0_rgb(255_255_255/0.1)] transition active:translate-y-0.5 active:shadow-none disabled:cursor-default"
    >
      {line}
    </button>
  );
}

export function OrderCodeExercise({ exercise, value, onChange, feedback }) {
  const locked = feedback !== null;
  const remaining = value.pool.filter((i) => !value.picked.includes(i));

  return (
    <div className="space-y-6">
      <div
        className={`min-h-40 space-y-2 rounded-3xl border-2 border-dashed p-4 ${
          feedback === 'correct' ? 'border-lime-500 bg-lime-400/10' : feedback === 'wrong' ? 'border-heart-500 bg-red-500/10' : 'border-tint/20'
        }`}
      >
        {value.picked.length === 0 && <p className="py-10 text-center font-bold text-ink-muted">Tap the lines below in the right order</p>}
        {value.picked.map((lineIndex, position) => (
          <div key={lineIndex} className="flex items-center gap-2">
            <span className="w-5 text-right font-mono text-xs font-bold text-ink-muted">{position + 1}</span>
            <CodeTile
              line={exercise.lines[lineIndex]}
              disabled={locked}
              onClick={() => onChange({ ...value, picked: value.picked.filter((i) => i !== lineIndex) })}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {remaining.map((lineIndex) => (
          <CodeTile
            key={lineIndex}
            line={exercise.lines[lineIndex]}
            disabled={locked}
            onClick={() => onChange({ ...value, picked: [...value.picked, lineIndex] })}
          />
        ))}
      </div>
    </div>
  );
}
