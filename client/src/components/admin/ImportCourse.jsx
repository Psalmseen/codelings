import { useState } from 'react';
import { CircleAlert, ClipboardCopy, ExternalLink, Sparkles } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { buildCoursePrompt, describeImportIssue, extractCourseJson } from '../../lib/coursePrompt';
import { EXERCISE_TYPES } from './ExerciseEditor';
import { Spinner } from '../ui';

function StepHeading({ number, children }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-black">
      <span className="flex size-7 items-center justify-center rounded-full bg-neon-500 text-sm text-white">{number}</span>
      {children}
    </h3>
  );
}

function Preview({ summary }) {
  const lessons = summary.modules.flatMap((m) => m.lessons);
  const exercises = lessons.flatMap((l) => l.exerciseTypes);
  return (
    <div className="rounded-2xl border-2 border-lime-400/40 bg-lime-400/10 p-4">
      <p className="font-black text-lime-300 light:text-lime-700">
        {summary.emoji} {summary.title}
      </p>
      <p className="mb-3 text-sm font-bold text-lime-300 light:text-lime-700">
        {summary.modules.length} modules · {lessons.length} lessons · {exercises.length} exercises
      </p>
      <ol className="max-h-56 space-y-2 overflow-y-auto pr-1 text-sm">
        {summary.modules.map((mod, i) => (
          <li key={i}>
            <p className="font-extrabold text-ink-soft">
              {i + 1}. {mod.title}
            </p>
            <ul className="ml-5 list-disc font-semibold text-ink-muted">
              {mod.lessons.map((lesson, j) => (
                <li key={j}>
                  {lesson.title}{' '}
                  <span className="text-ink-muted">({lesson.exerciseTypes.map((t) => EXERCISE_TYPES[t].label.toLowerCase()).join(', ')})</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Two steps: copy a prompt for claude.ai, then paste the reply back to create a draft course. */
export default function ImportCourse({ onImported }) {
  const toast = useToast();
  const [request, setRequest] = useState({ topic: '', audience: 'Complete beginners', moduleCount: 3, lessonsPerModule: 4 });
  const [reply, setReply] = useState('');
  const [course, setCourse] = useState(null); // parsed JSON that passed validation
  const [summary, setSummary] = useState(null);
  const [issues, setIssues] = useState([]);
  const [busy, setBusy] = useState(false);

  async function copyPrompt() {
    await navigator.clipboard.writeText(buildCoursePrompt(request));
    toast('Prompt copied. Paste it into Claude');
  }

  function fail(err) {
    setCourse(null);
    setSummary(null);
    setIssues(err.details?.length ? err.details.map(describeImportIssue) : [err.message]);
  }

  async function check() {
    setBusy(true);
    setIssues([]);
    try {
      const parsed = extractCourseJson(reply);
      const result = await api('/admin/courses/import?dryRun=1', { method: 'POST', body: parsed });
      setCourse(parsed);
      setSummary(result.summary);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function importCourse() {
    setBusy(true);
    try {
      const result = await api('/admin/courses/import', { method: 'POST', body: course });
      toast('Course imported as a draft');
      onImported(result.course);
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  }

  const set = (patch) => setRequest((r) => ({ ...r, ...patch }));

  return (
    <div className="space-y-6">
      <section>
        <StepHeading number={1}>Describe the course and copy the prompt</StepHeading>
        <div className="space-y-3">
          <textarea
            rows={3}
            className="input"
            placeholder="e.g. JavaScript fundamentals: variables, conditions, loops and functions, building up to a small to-do list app"
            value={request.topic}
            onChange={(e) => set({ topic: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-sm font-bold text-ink-muted">
              Audience
              <select className="input mt-1 py-2" value={request.audience} onChange={(e) => set({ audience: e.target.value })}>
                <option>Complete beginners</option>
                <option>Beginners who know some HTML</option>
                <option>Intermediate learners</option>
              </select>
            </label>
            <label className="text-sm font-bold text-ink-muted">
              Modules
              <input type="number" min={1} max={10} className="input mt-1 py-2" value={request.moduleCount} onChange={(e) => set({ moduleCount: Number(e.target.value) })} />
            </label>
            <label className="text-sm font-bold text-ink-muted">
              Lessons per module
              <input type="number" min={1} max={10} className="input mt-1 py-2" value={request.lessonsPerModule} onChange={(e) => set({ lessonsPerModule: Number(e.target.value) })} />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary btn-sm" disabled={!request.topic.trim()} onClick={copyPrompt}>
              <ClipboardCopy className="size-4" /> Copy prompt
            </button>
            <a className="btn btn-secondary btn-sm" href="https://claude.ai/new" target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> Open Claude
            </a>
          </div>
          <p className="text-xs font-semibold text-ink-muted">
            Paste the prompt into a new Claude chat. Large courses may take Claude a minute; if the reply gets cut off, ask for fewer lessons.
          </p>
        </div>
      </section>

      <section>
        <StepHeading number={2}>Paste Claude's reply</StepHeading>
        <textarea
          rows={7}
          spellCheck={false}
          className="input-code"
          placeholder='{ "title": "…", "modules": [ … ] }'
          value={reply}
          onChange={(e) => {
            setReply(e.target.value);
            setSummary(null);
            setIssues([]);
          }}
        />
        <button className="btn btn-secondary btn-sm mt-2" disabled={!reply.trim() || busy} onClick={check}>
          {busy && !summary ? <Spinner className="size-4" /> : <Sparkles className="size-4" />} Check course
        </button>
      </section>

      {issues.length > 0 && (
        <div className="rounded-2xl border-2 border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-heart-500">
          <p className="mb-1 flex items-center gap-2">
            <CircleAlert className="size-4" /> Some things need fixing. Tell Claude about them and paste the new reply:
          </p>
          <ul className="max-h-40 list-disc overflow-y-auto pl-6">
            {issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {summary && (
        <section>
          <StepHeading number={3}>Looks good! Import it</StepHeading>
          <Preview summary={summary} />
          <button className="btn btn-primary mt-3 w-full" disabled={busy} onClick={importCourse}>
            {busy ? <Spinner /> : 'Import as draft'}
          </button>
          <p className="mt-2 text-center text-xs font-semibold text-ink-muted">You can review and edit everything before publishing.</p>
        </section>
      )}
    </div>
  );
}
