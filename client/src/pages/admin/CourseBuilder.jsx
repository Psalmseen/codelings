import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowDown, ArrowLeft, ArrowUp, Eye, Pencil, PlayCircle, Plus, Settings, Trash2 } from 'lucide-react';
import CohortsCard from '../../components/admin/CohortsCard';
import CourseForm from '../../components/admin/CourseForm';
import { ConfirmButton, ErrorState, Modal, PageLoader, Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../lib/api';
import { courseGlow } from '../../lib/format';
import { StatusBadge } from './AdminCourses';

function moved(list, index, delta) {
  const next = [...list];
  [next[index], next[index + delta]] = [next[index + delta], next[index]];
  return next;
}

/** Single-line input + button; clears itself only when `onAdd` succeeds. */
function AddInline({ placeholder, buttonLabel, onAdd }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    const ok = await onAdd(value.trim());
    setBusy(false);
    if (ok) setValue('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input className="input py-2.5" placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
      <button className="btn btn-secondary shrink-0" disabled={busy || !value.trim()}>
        {busy ? <Spinner className="size-4" /> : <Plus className="size-4" />}
        <span className="hidden sm:inline">{buttonLabel}</span>
      </button>
    </form>
  );
}

/** Click-to-edit heading text. */
function InlineTitle({ value, onSave, className }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <button
        className={`group flex min-w-0 cursor-pointer items-center gap-2 text-left ${className}`}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
      >
        <span className="truncate">{value}</span>
        <Pencil className="size-4 shrink-0 text-slate-600 group-hover:text-slate-500" />
      </button>
    );
  }

  const finish = async () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== value) await onSave(draft.trim());
  };

  return (
    <input
      autoFocus
      className="input py-1.5"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={finish}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') setEditing(false);
      }}
    />
  );
}

function ModuleCard({ mod, index, isLast, onMove, mutate }) {
  const base = `/modules/${mod._id}`;
  const lessonIds = mod.lessons.map((l) => l._id);

  return (
    <section className="card p-0">
      <header className="flex items-center gap-2 border-b-2 border-white/5 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black tracking-wider text-slate-400 uppercase">Module {index + 1}</p>
          <InlineTitle className="text-lg font-black" value={mod.title} onSave={(title) => mutate(base, 'PATCH', { title }, 'Module renamed')} />
        </div>
        <button className="icon-btn" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move module up">
          <ArrowUp className="size-5" />
        </button>
        <button className="icon-btn" disabled={isLast} onClick={() => onMove(1)} aria-label="Move module down">
          <ArrowDown className="size-5" />
        </button>
        <ConfirmButton title="Delete module and its lessons" confirmLabel="Delete?" onConfirm={() => mutate(base, 'DELETE', undefined, 'Module deleted')}>
          <Trash2 className="size-5" />
        </ConfirmButton>
      </header>

      <ol className="divide-y-2 divide-white/5">
        {mod.lessons.map((lesson, i) => (
          <li key={lesson._id} className="flex items-center gap-3 px-5 py-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-black text-slate-400">{i + 1}</span>
            <Link to={`/admin/lessons/${lesson._id}`} className="min-w-0 flex-1 hover:text-neon-300">
              <p className="truncate font-extrabold">{lesson.title}</p>
              <p className="flex items-center gap-2 text-xs font-bold text-slate-400">
                {lesson.hasVideo && <PlayCircle className="size-3.5" />}
                {lesson.exerciseCount} exercise{lesson.exerciseCount === 1 ? '' : 's'} · {lesson.xp} XP
                {lesson.exerciseCount === 0 && <span className="badge bg-orange-400/15 text-orange-300">Needs exercises</span>}
              </p>
            </Link>
            <button className="icon-btn" disabled={i === 0} onClick={() => mutate(`${base}/lessons/order`, 'PUT', { order: moved(lessonIds, i, -1) })} aria-label="Move lesson up">
              <ArrowUp className="size-4" />
            </button>
            <button className="icon-btn" disabled={i === mod.lessons.length - 1} onClick={() => mutate(`${base}/lessons/order`, 'PUT', { order: moved(lessonIds, i, 1) })} aria-label="Move lesson down">
              <ArrowDown className="size-4" />
            </button>
            <Link to={`/admin/lessons/${lesson._id}`} className="btn btn-secondary btn-sm">
              Edit
            </Link>
          </li>
        ))}
      </ol>

      <div className="px-5 py-4">
        <AddInline
          placeholder={mod.lessons.length ? 'Next lesson title…' : 'First lesson title…'}
          buttonLabel="Add lesson"
          onAdd={(title) => mutate(`${base}/lessons`, 'POST', { title }, 'Lesson added')}
        />
      </div>
    </section>
  );
}

export default function CourseBuilder() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useFetch(`/admin/courses/${courseId}`);
  const [editingSettings, setEditingSettings] = useState(false);

  /** Runs a builder mutation, swaps in the returned course and reports success. */
  async function mutate(path, method, body, successMessage) {
    try {
      const result = await api(`/admin/courses/${courseId}${path}`, { method, body });
      setData(result);
      if (successMessage) toast(successMessage);
      return true;
    } catch (err) {
      toast(err.message, 'error');
      return false;
    }
  }

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { course } = data;
  const moduleIds = course.modules.map((m) => m._id);
  const lessonTotal = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const published = course.status === 'published';

  async function deleteCourse() {
    try {
      await api(`/admin/courses/${courseId}`, { method: 'DELETE' });
      toast('Course deleted');
      navigate('/admin/courses');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <>
      <Link to="/admin/courses" className="mb-4 inline-flex items-center gap-1 text-sm font-extrabold text-slate-400 uppercase hover:text-slate-200">
        <ArrowLeft className="size-4" /> Courses
      </Link>

      <div className="card mb-6 flex flex-wrap items-center gap-4">
        <span
          className="flex size-16 shrink-0 items-center justify-center rounded-2xl text-4xl"
          style={courseGlow(course.color)}
        >
          {course.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-black">{course.title}</h1>
            <StatusBadge status={course.status} />
          </div>
          <p className="text-sm font-bold text-slate-400">
            {course.modules.length} modules · {lessonTotal} lessons · {course.pacing === 'cohort' ? 'Cohort' : 'Self-paced'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => setEditingSettings(true)}>
            <Settings className="size-4" /> Settings
          </button>
          <Link to={`/learn/courses/${courseId}`} className="btn btn-secondary btn-sm">
            <Eye className="size-4" /> Preview
          </Link>
          <button
            className={`btn btn-sm ${published ? 'btn-secondary' : 'btn-primary'}`}
            disabled={!published && lessonTotal === 0}
            title={!published && lessonTotal === 0 ? 'Add at least one lesson first' : undefined}
            onClick={() => mutate('', 'PATCH', { status: published ? 'draft' : 'published' }, published ? 'Course unpublished' : 'Course is live! 🎉')}
          >
            {published ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      {(course.pacing === 'cohort' || course.cohorts.length > 0) && <CohortsCard cohorts={course.cohorts} mutate={mutate} />}

      <div className="space-y-5">
        {course.modules.map((mod, index) => (
          <ModuleCard
            key={mod._id}
            mod={mod}
            index={index}
            isLast={index === course.modules.length - 1}
            onMove={(delta) => mutate('/modules/order', 'PUT', { order: moved(moduleIds, index, delta) })}
            mutate={mutate}
          />
        ))}

        <div className="card border-dashed">
          <p className="mb-3 font-black">{course.modules.length ? 'Add another module' : 'Start with a module'}</p>
          <AddInline placeholder="e.g. Variables & data types" buttonLabel="Add module" onAdd={(title) => mutate('/modules', 'POST', { title }, 'Module added')} />
        </div>
      </div>

      <div className="mt-10 flex justify-end">
        <ConfirmButton className="btn btn-ghost btn-sm text-heart-500" confirmLabel="Delete course forever?" onConfirm={deleteCourse}>
          <Trash2 className="size-4" /> Delete course
        </ConfirmButton>
      </div>

      {editingSettings && (
        <Modal title="Course settings" onClose={() => setEditingSettings(false)}>
          <CourseForm
            initial={course}
            submitLabel="Save"
            onSubmit={async (form) => {
              setData(await api(`/admin/courses/${courseId}`, { method: 'PATCH', body: form }));
              setEditingSettings(false);
              toast('Settings saved');
            }}
          />
        </Modal>
      )}
    </>
  );
}
