import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { EXERCISE_TYPES, ExerciseCard, newExercise } from '../../components/admin/ExerciseEditor';
import { ConfirmButton, ErrorState, PageLoader, Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../lib/api';
import { videoEmbedUrl } from '../../lib/format';

function toDraft(lesson) {
  return {
    title: lesson.title,
    videoUrl: lesson.videoUrl ?? '',
    reading: lesson.reading ?? '',
    xp: lesson.xp ?? 10,
    exercises: lesson.exercises.map((exercise) => ({ ...exercise, key: exercise._id })),
  };
}

const toPayload = (draft) => ({ ...draft, exercises: draft.exercises.map(({ key, ...exercise }) => exercise) });

function describeIssue({ path, message }) {
  return path[0] === 'exercises' && typeof path[1] === 'number' ? `Exercise ${path[1] + 1}: ${message}` : message;
}

export default function LessonEditor() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(`/admin/lessons/${lessonId}`);
  const [draft, setDraft] = useState(null);
  const [savedJson, setSavedJson] = useState('');
  const [issues, setIssues] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const initial = toDraft(data.lesson);
    setDraft(initial);
    setSavedJson(JSON.stringify(toPayload(initial)));
  }, [data]);

  const dirty = draft !== null && JSON.stringify(toPayload(draft)) !== savedJson;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!draft) return null;

  const backTo = `/admin/courses/${data.course?._id}`;
  const embedUrl = videoEmbedUrl(draft.videoUrl);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setExercises = (update) => setDraft((d) => ({ ...d, exercises: update(d.exercises) }));

  async function save() {
    setSaving(true);
    setIssues([]);
    try {
      const { lesson } = await api(`/admin/lessons/${lessonId}`, { method: 'PUT', body: toPayload(draft) });
      const fresh = toDraft(lesson);
      setDraft(fresh);
      setSavedJson(JSON.stringify(toPayload(fresh)));
      toast('Lesson saved');
    } catch (err) {
      setIssues(err.details?.length ? err.details.map(describeIssue) : [err.message]);
      toast('Fix the highlighted problems and save again', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function deleteLesson() {
    try {
      await api(`/admin/lessons/${lessonId}`, { method: 'DELETE' });
      toast('Lesson deleted');
      navigate(backTo);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div className="pb-28">
      <Link to={backTo} className="mb-4 inline-flex items-center gap-1 text-sm font-extrabold text-ink-muted uppercase hover:text-ink-soft">
        <ArrowLeft className="size-4" /> {data.course?.title} · {data.module?.title}
      </Link>

      <div className="card mb-6 grid gap-4 sm:grid-cols-[1fr_120px]">
        <div>
          <label className="label" htmlFor="lesson-title">Lesson title</label>
          <input id="lesson-title" className="input text-lg font-black" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="lesson-xp">XP reward</label>
          <input
            id="lesson-xp"
            type="number"
            min={1}
            max={100}
            className="input"
            value={draft.xp}
            onChange={(e) => set({ xp: Number(e.target.value) })}
          />
        </div>
      </div>

      <section className="card mb-6 space-y-4">
        <h2 className="text-lg font-black">1. Learn</h2>
        <div>
          <label className="label" htmlFor="lesson-video">Video link (YouTube or Vimeo, optional)</label>
          <input
            id="lesson-video"
            className="input"
            placeholder="https://www.youtube.com/watch?v=…"
            value={draft.videoUrl}
            onChange={(e) => set({ videoUrl: e.target.value })}
          />
          {draft.videoUrl && !embedUrl && <p className="mt-1 text-sm font-bold text-orange-400 light:text-orange-600">This link can't be previewed. Is it a YouTube or Vimeo URL?</p>}
          {embedUrl && (
            <iframe
              className="mt-3 aspect-video w-full rounded-2xl bg-tint/10"
              src={embedUrl}
              title="Video preview"
              allow="accelerometer; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
        <div>
          <label className="label" htmlFor="lesson-reading">Notes (optional, Markdown supported)</label>
          <textarea
            id="lesson-reading"
            rows={6}
            className="input"
            placeholder="Short explanation students read before the exercises. Use **bold** and `code`."
            value={draft.reading}
            onChange={(e) => set({ reading: e.target.value })}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-black">2. Practise ({draft.exercises.length})</h2>
        {draft.exercises.length === 0 && (
          <p className="font-semibold text-ink-muted">Add a few quick exercises. 3–6 short ones keep students hooked better than one long one.</p>
        )}
        {draft.exercises.map((exercise, index) => (
          <ExerciseCard
            key={exercise.key}
            exercise={exercise}
            index={index}
            isLast={index === draft.exercises.length - 1}
            onChange={(next) => setExercises((list) => list.map((e, i) => (i === index ? next : e)))}
            onRemove={() => setExercises((list) => list.filter((_, i) => i !== index))}
            onMove={(delta) =>
              setExercises((list) => {
                const next = [...list];
                [next[index], next[index + delta]] = [next[index + delta], next[index]];
                return next;
              })
            }
          />
        ))}

        <div className="card border-dashed">
          <p className="mb-3 font-black">Add an exercise</p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {Object.entries(EXERCISE_TYPES).map(([type, meta]) => (
              <button
                key={type}
                type="button"
                className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-tint/10 p-4 font-extrabold transition hover:border-neon-400/60 hover:bg-neon-500/10"
                onClick={() => setExercises((list) => [...list, newExercise(type)])}
              >
                <span className={`flex size-10 items-center justify-center rounded-xl ${meta.tint}`}>
                  <meta.icon className="size-5" />
                </span>
                <span className="text-center text-sm">{meta.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-10 flex justify-end">
        <ConfirmButton className="btn btn-ghost btn-sm text-heart-500" confirmLabel="Delete lesson?" onConfirm={deleteLesson}>
          <Trash2 className="size-4" /> Delete lesson
        </ConfirmButton>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-tint/10 glass-strong backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 lg:px-10">
          <div className="min-w-0 flex-1 text-sm font-bold">
            {issues.length > 0 ? (
              <ul className="max-h-20 overflow-y-auto text-heart-500">
                {issues.map((issue, i) => (
                  <li key={i}>• {issue}</li>
                ))}
              </ul>
            ) : (
              <span className={dirty ? 'text-orange-400 light:text-orange-600' : 'text-ink-muted'}>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
            )}
          </div>
          <button className="btn btn-primary" disabled={saving || !dirty} onClick={save}>
            {saving ? <Spinner /> : 'Save lesson'}
          </button>
        </div>
      </div>
    </div>
  );
}
