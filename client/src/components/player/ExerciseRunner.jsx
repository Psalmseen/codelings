import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { CircleCheck, CircleX, Heart } from 'lucide-react';
import { correctAnswer, initialValue, isCorrect, isReady } from '../../lib/exercises';
import { sounds } from '../../lib/sound';
import { PageLoader, Spinner } from '../ui';
import PlayerShell, { PlayerFooter } from './PlayerShell';
import { FillBlankExercise, McqExercise, OrderCodeExercise } from './QuizExercises';

// The code editor is heavy, so it only loads when a lesson has a code challenge
const CodeChallenge = lazy(() => import('./CodeChallenge'));

const QUIZ_COMPONENTS = { mcq: McqExercise, fill_blank: FillBlankExercise, order_code: OrderCodeExercise };
const TYPE_LABELS = {
  mcq: 'Choose the right answer',
  fill_blank: 'Fill in the blank',
  order_code: 'Arrange the code',
  code_challenge: 'Code challenge',
};
const PRAISE = ['Nice!', 'Awesome!', 'You got it!', 'Great job!', 'Brilliant!', 'Nailed it!'];

const isTypingTarget = (el) => el.tagName === 'TEXTAREA' || el.closest?.('.cm-editor');

/**
 * Plays a list of exercises one at a time. Wrong quiz answers go to the back of the queue
 * until answered correctly. Failed code checks cost a heart (when `hearts` isn't null).
 * `paused` turns off keyboard shortcuts while something is shown on top.
 */
export default function ExerciseRunner({ exercises, hearts = null, paused = false, onCodeFail, onOutOfHearts, onFinish, onClose }) {
  const [queue, setQueue] = useState(() => exercises.map((_, i) => i));
  const [solved, setSolved] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [value, setValue] = useState(() => initialValue(exercises[0]));
  const [phase, setPhase] = useState('answer'); // answer | correct | wrong | codeFailed
  const [codeSummary, setCodeSummary] = useState(null);
  const [checking, setChecking] = useState(false);
  const [round, setRound] = useState(0);
  const codeRef = useRef(null);

  const exercise = exercises[queue[0]];
  const isCode = exercise.type === 'code_challenge';
  const ready = isReady(exercise, value);

  async function check() {
    if (!isCode) {
      if (isCorrect(exercise, value)) {
        setPhase('correct');
        sounds.correct();
      } else {
        setPhase('wrong');
        setMistakes((m) => m + 1);
        sounds.wrong();
      }
      return;
    }

    if (hearts !== null && hearts <= 0) return onOutOfHearts?.();
    setChecking(true);
    const summary = await codeRef.current.run();
    setChecking(false);
    setCodeSummary(summary);
    if (summary.passed) {
      setPhase('correct');
      sounds.correct();
      return;
    }
    setPhase('codeFailed');
    setMistakes((m) => m + 1);
    sounds.heartLost();
    const heartsLeft = await onCodeFail?.();
    if (heartsLeft === 0) onOutOfHearts?.();
  }

  function next() {
    if (phase === 'codeFailed') return setPhase('answer');

    const remaining = phase === 'correct' ? queue.slice(1) : [...queue.slice(1), queue[0]];
    if (phase === 'correct') setSolved((s) => s + 1);
    if (remaining.length === 0) return onFinish({ total: exercises.length, mistakes });

    setQueue(remaining);
    setValue(initialValue(exercises[remaining[0]]));
    setPhase('answer');
    setCodeSummary(null);
    setRound((r) => r + 1);
  }

  // Enter checks the answer, then continues
  useEffect(() => {
    const onKey = (e) => {
      if (paused || e.key !== 'Enter' || isTypingTarget(e.target)) return;
      e.preventDefault();
      if (phase === 'answer') {
        if (ready && !checking) check();
      } else next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const feedback = phase === 'correct' ? 'correct' : phase === 'wrong' ? 'wrong' : null;
  const Quiz = QUIZ_COMPONENTS[exercise.type];

  let footer;
  if (phase === 'answer') {
    footer = (
      <PlayerFooter>
        <div className="flex-1" />
        <button className="btn btn-primary w-full sm:w-44" disabled={!ready || checking} onClick={check}>
          {checking ? <Spinner /> : isCode ? 'Check my code' : 'Check'}
        </button>
      </PlayerFooter>
    );
  } else if (phase === 'correct') {
    footer = (
      <PlayerFooter tone="correct">
        <div className="flex flex-1 items-start gap-3 text-lime-800">
          <CircleCheck className="size-9 shrink-0" fill="white" />
          <div>
            <p className="text-xl font-black">{PRAISE[round % PRAISE.length]}</p>
            {exercise.explanation && <p className="font-semibold">{exercise.explanation}</p>}
          </div>
        </div>
        <button className="btn w-full bg-lime-500 text-white shadow-[0_4px_0_var(--color-lime-700)] active:shadow-none sm:w-44" onClick={next}>
          Continue
        </button>
      </PlayerFooter>
    );
  } else if (phase === 'wrong') {
    footer = (
      <PlayerFooter tone="wrong">
        <div className="flex min-w-0 flex-1 items-start gap-3 text-red-700">
          <CircleX className="size-9 shrink-0" fill="white" />
          <div className="min-w-0">
            <p className="text-xl font-black">Correct answer:</p>
            <pre className="font-mono text-sm font-bold whitespace-pre-wrap">{correctAnswer(exercise)}</pre>
            {exercise.explanation && <p className="mt-1 font-semibold">{exercise.explanation}</p>}
            <p className="mt-1 text-sm font-bold opacity-70">You'll see this one again.</p>
          </div>
        </div>
        <button className="btn btn-danger w-full sm:w-44" onClick={next}>
          Got it
        </button>
      </PlayerFooter>
    );
  } else {
    footer = (
      <PlayerFooter tone="wrong">
        <div className="flex flex-1 items-start gap-3 text-red-700">
          <CircleX className="size-9 shrink-0" fill="white" />
          <div>
            <p className="text-xl font-black">Not quite yet</p>
            <p className="font-semibold">
              {codeSummary.passedCount} of {codeSummary.total} goals done.
              {hearts !== null && (
                <span className="ml-1 inline-flex items-center gap-1 font-black">
                  −1 <Heart className="size-4" fill="currentColor" />
                </span>
              )}
            </p>
          </div>
        </div>
        <button className="btn btn-danger w-full sm:w-44" onClick={next}>
          Try again
        </button>
      </PlayerFooter>
    );
  }

  return (
    <PlayerShell progress={solved / exercises.length} hearts={hearts} onClose={onClose} footer={footer} wide={isCode}>
      <p className="mb-1 text-sm font-black tracking-wider text-grape-500 uppercase">{TYPE_LABELS[exercise.type]}</p>
      <h1 className="mb-6 text-2xl font-black whitespace-pre-wrap sm:text-3xl">{exercise.prompt}</h1>
      {isCode ? (
        <Suspense fallback={<PageLoader />}>
          <CodeChallenge key={round} ref={codeRef} exercise={exercise} value={value} onChange={setValue} locked={phase === 'correct'} />
        </Suspense>
      ) : (
        <Quiz key={round} exercise={exercise} value={value} onChange={setValue} feedback={feedback} paused={paused} />
      )}
    </PlayerShell>
  );
}
