import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Heart } from 'lucide-react';
import Mascot from '../../components/Mascot';
import ExerciseRunner from '../../components/player/ExerciseRunner';
import LessonComplete from '../../components/player/LessonComplete';
import PlayerShell, { PlayerFooter } from '../../components/player/PlayerShell';
import PracticeRound from '../../components/player/PracticeRound';
import { ErrorState, Modal, PageLoader, Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../lib/api';
import { videoEmbedUrl } from '../../lib/format';
import { renderMarkdown } from '../../lib/markdown';
import { sounds } from '../../lib/sound';

function LessonIntro({ lesson, course, onStart, onClose }) {
  const embedUrl = videoEmbedUrl(lesson.videoUrl);
  const hasExercises = lesson.exercises.length > 0;

  return (
    <PlayerShell
      onClose={onClose}
      footer={
        <PlayerFooter>
          <p className="flex-1 font-bold text-slate-400">
            {hasExercises && `${lesson.exercises.length} exercise${lesson.exercises.length === 1 ? '' : 's'} · `}+{lesson.xp} XP
          </p>
          <button className="btn btn-primary w-full sm:w-52" onClick={onStart} autoFocus>
            {hasExercises ? 'Start practice' : 'Complete lesson'}
          </button>
        </PlayerFooter>
      }
    >
      <p className="mb-1 text-sm font-black tracking-wider uppercase" style={{ color: course.color }}>
        {course.emoji} {course.title}
      </p>
      <h1 className="mb-6 text-3xl font-black">{lesson.title}</h1>
      {embedUrl && (
        <iframe
          className="mb-6 aspect-video w-full rounded-3xl bg-slate-100"
          src={embedUrl}
          title={lesson.title}
          allow="accelerometer; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      )}
      {lesson.reading.trim() && (
        <div className="lesson-prose rounded-3xl border-2 border-slate-200 p-5" dangerouslySetInnerHTML={{ __html: renderMarkdown(lesson.reading) }} />
      )}
      {!embedUrl && !lesson.reading.trim() && (
        <div className="flex items-center gap-4">
          <Mascot size={90} mood="excited" />
          <p className="text-lg font-bold text-slate-500">Jump straight in, you'll learn as you go!</p>
        </div>
      )}
    </PlayerShell>
  );
}

export default function LessonPlayer() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { data, loading, error, reload } = useFetch(`/learn/lessons/${lessonId}`);
  const [stage, setStage] = useState('intro'); // intro | practice | saving | done | saveError
  const [stats, setStats] = useState(null);
  const [result, setResult] = useState(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [outOfHearts, setOutOfHearts] = useState(false);
  const [practising, setPractising] = useState(false);

  useEffect(() => {
    setStage('intro');
    setResult(null);
  }, [lessonId]);

  if (loading && !data) return <PageLoader />;
  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <ErrorState error={error} onRetry={error.status === 403 ? undefined : reload} />
        <Link to="/learn" className="btn btn-secondary mt-4 w-full">
          Back to my courses
        </Link>
      </div>
    );
  }

  const { lesson, course, preview } = data;
  const backToMap = () => navigate(`/learn/courses/${course._id}`);
  const hearts = preview ? null : user.hearts.count;

  async function complete(runStats) {
    setStats(runStats);
    setStage('saving');
    try {
      const response = await api(`/learn/lessons/${lessonId}/complete`, { method: 'POST' });
      if (!response.preview) setUser(response.user);
      setResult({ ...response, ...runStats });
      sounds.complete();
      setStage('done');
    } catch {
      setStage('saveError');
    }
  }

  async function loseHeart() {
    const { user: updated } = await api('/learn/hearts/lose', { method: 'POST' });
    setUser(updated);
    return updated.hearts.count;
  }

  if (stage === 'intro') {
    return (
      <LessonIntro
        lesson={lesson}
        course={course}
        onClose={backToMap}
        onStart={() => (lesson.exercises.length ? setStage('practice') : complete({ total: 0, mistakes: 0 }))}
      />
    );
  }

  if (stage === 'saving' || stage === 'saveError') {
    return (
      <PlayerShell onClose={backToMap}>
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          {stage === 'saving' ? (
            <Spinner className="size-10 text-grape-500" />
          ) : (
            <>
              <Mascot size={90} mood="sad" />
              <p className="font-bold text-slate-500">We couldn't save your progress. Check your connection.</p>
              <button className="btn btn-primary" onClick={() => complete(stats)}>
                Try again
              </button>
            </>
          )}
        </div>
      </PlayerShell>
    );
  }

  if (stage === 'done') return <LessonComplete result={result} onContinue={backToMap} />;

  return (
    <>
      {/* The runner stays mounted during a practice round so the student keeps their place */}
      <div className={practising ? 'hidden' : undefined}>
        <ExerciseRunner
          exercises={lesson.exercises}
          hearts={hearts}
          paused={practising || outOfHearts || confirmQuit}
          onCodeFail={preview ? undefined : loseHeart}
          onOutOfHearts={() => setOutOfHearts(true)}
          onFinish={complete}
          onClose={() => setConfirmQuit(true)}
        />
      </div>

      {practising && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
          <PracticeRound doneLabel="Back to the lesson" onClose={() => setPractising(false)} onDone={() => setPractising(false)} />
        </div>
      )}

      {confirmQuit && (
        <Modal title="Leave this lesson?" onClose={() => setConfirmQuit(false)}>
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot size={90} mood="sad" />
            <p className="font-semibold text-slate-500">You'll lose your progress in this lesson.</p>
            <button className="btn btn-primary w-full" onClick={() => setConfirmQuit(false)} autoFocus>
              Keep learning
            </button>
            <button className="btn btn-ghost w-full text-heart-500" onClick={backToMap}>
              Quit lesson
            </button>
          </div>
        </Modal>
      )}

      {outOfHearts && (
        <Modal title="Out of hearts!" onClose={() => setOutOfHearts(false)}>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex gap-1 text-slate-300">
              {Array.from({ length: 5 }, (_, i) => (
                <Heart key={i} className="size-8" fill="currentColor" />
              ))}
            </div>
            <p className="font-semibold text-slate-500">
              Do a quick practice round to refill your hearts. Your code is saved here, so you can pick up where you left off.
            </p>
            <button
              className="btn btn-primary w-full"
              autoFocus
              onClick={() => {
                setOutOfHearts(false);
                setPractising(true);
              }}
            >
              Practise to refill
            </button>
            <button className="btn btn-ghost w-full" onClick={backToMap}>
              Leave lesson
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
