import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../lib/api';
import { sounds } from '../../lib/sound';
import Mascot from '../Mascot';
import { ErrorState, PageLoader, Spinner } from '../ui';
import ExerciseRunner from './ExerciseRunner';
import PlayerShell, { PlayerFooter } from './PlayerShell';

/** Quick quiz round that refills hearts. `onDone` runs after the refill is saved. */
export default function PracticeRound({ onClose, onDone, doneLabel = 'Back to learning' }) {
  const { setUser } = useAuth();
  const { data, loading, error, reload } = useFetch('/learn/practice');
  const [stage, setStage] = useState('playing'); // playing | saving | done | error

  async function refill() {
    setStage('saving');
    try {
      const { user } = await api('/learn/practice/complete', { method: 'POST' });
      setUser(user);
      sounds.complete();
      setStage('done');
    } catch {
      setStage('error');
    }
  }

  // Nothing to practise yet: refill straight away
  const empty = data?.exercises.length === 0;
  useEffect(() => {
    if (empty) refill();
  }, [empty]);

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  if (stage === 'playing' && !empty) {
    return <ExerciseRunner exercises={data.exercises} onClose={onClose} onFinish={refill} />;
  }

  return (
    <PlayerShell
      onClose={onClose}
      footer={
        stage !== 'saving' && (
          <PlayerFooter>
            <div className="flex-1" />
            <button className="btn btn-primary w-full sm:w-56" onClick={stage === 'error' ? refill : onDone}>
              {stage === 'error' ? 'Try again' : doneLabel}
            </button>
          </PlayerFooter>
        )
      }
    >
      <div className="flex flex-col items-center py-10 text-center">
        {stage === 'saving' && <Spinner className="size-10 text-neon-400 light:text-neon-600" />}
        {stage === 'error' && <p className="font-bold text-heart-500">Couldn't save your hearts. Check your connection.</p>}
        {stage === 'done' && (
          <>
            <Mascot size={130} mood="excited" className="animate-float" />
            <h1 className="mt-4 text-3xl font-black">Hearts refilled!</h1>
            <div className="mt-4 flex gap-1 text-heart-500">
              {Array.from({ length: 5 }, (_, i) => (
                <Heart key={i} className="size-9" fill="currentColor" />
              ))}
            </div>
            <p className="mt-4 font-semibold text-ink-muted">Practice makes progress. Back to it!</p>
          </>
        )}
      </div>
    </PlayerShell>
  );
}
