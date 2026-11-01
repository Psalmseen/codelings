import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import CodeMirror from '@uiw/react-codemirror';
import { CircleCheck, CircleX, Target } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const TABS = [
  { key: 'html', label: 'HTML', extension: html() },
  { key: 'css', label: 'CSS', extension: css() },
  { key: 'js', label: 'JS', extension: javascript() },
];

const CHECK_TIMEOUT_MS = 4000;

const escapeScript = (code) => code.replace(/<\/script/gi, '<\\/script');

/** Builds the sandboxed preview page; with `tests`, it also runs the checks and reports back. */
function buildDocument(code, tests, runId) {
  const runner = tests
    ? `<script>
window.addEventListener('load', function () {
  var tests = ${JSON.stringify(tests.map((t) => t.check)).replace(/</g, '\\u003c')};
  var results = tests.map(function (check) {
    try { return { passed: !!(new Function('return (' + check + ')'))() }; }
    catch (e) { return { passed: false, error: e.message }; }
  });
  parent.postMessage({ source: 'codelings', runId: ${runId}, results: results, errors: window.__errors }, '*');
});
</script>`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8">
<script>window.__errors=[];window.addEventListener('error',function(e){window.__errors.push(e.message)});</script>
<style>body{font-family:system-ui,sans-serif;margin:12px}${code.css}</style></head>
<body>${code.html}<script>${escapeScript(code.js)}</script>${runner}</body></html>`;
}

export default function CodeChallenge({ exercise, value, onChange, locked, ref }) {
  const { resolved: theme } = useTheme();
  const [tab, setTab] = useState(exercise.starter?.html || !exercise.starter?.js ? 'html' : 'js');
  const [doc, setDoc] = useState(() => buildDocument(value));
  const [results, setResults] = useState(null);
  const [runtimeErrors, setRuntimeErrors] = useState([]);
  const iframeRef = useRef(null);
  const runCounter = useRef(0);
  const previewTimer = useRef();

  // Live preview, debounced while typing
  useEffect(() => {
    previewTimer.current = setTimeout(() => setDoc(buildDocument(value)), 400);
    return () => clearTimeout(previewTimer.current);
  }, [value]);

  useImperativeHandle(ref, () => ({
    /** Runs every check against the current code; resolves to { passed, passedCount, total, failed labels }. */
    run() {
      const runId = ++runCounter.current;
      clearTimeout(previewTimer.current); // a pending preview refresh would replace the test run
      return new Promise((resolve) => {
        const finish = (checkResults, errors = []) => {
          window.removeEventListener('message', onMessage);
          clearTimeout(timer);
          setResults(checkResults);
          setRuntimeErrors(errors);
          const passedCount = checkResults.filter((r) => r.passed).length;
          const failed = exercise.tests.filter((_, i) => !checkResults[i]?.passed).map((t) => t.label);
          resolve({ passed: passedCount === checkResults.length, passedCount, total: checkResults.length, failed });
        };
        const onMessage = (event) => {
          const data = event.data;
          if (event.source !== iframeRef.current?.contentWindow || data?.source !== 'codelings' || data.runId !== runId) return;
          finish(data.results, data.errors);
        };
        const timer = setTimeout(
          () => finish(exercise.tests.map(() => ({ passed: false, error: 'Timed out' })), ['Your code took too long to run. Is there an endless loop?']),
          CHECK_TIMEOUT_MS
        );
        window.addEventListener('message', onMessage);
        setDoc(buildDocument(value, exercise.tests, runId));
      });
    },
  }));

  const current = TABS.find((t) => t.key === tab);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col overflow-hidden rounded-3xl border-2 border-tint/10">
        <div className="flex border-b-2 border-tint/10 bg-tint/[0.03]">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`cursor-pointer px-4 py-2.5 text-sm font-black transition ${tab === t.key ? 'bg-tint/10 text-neon-300 light:text-neon-700' : 'text-ink-muted hover:text-ink-soft'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <CodeMirror
          value={value[tab]}
          height="100%"
          extensions={[current.extension]}
          editable={!locked}
          theme={theme}
          basicSetup={{ foldGutter: false, highlightActiveLine: !locked }}
          onChange={(text) => onChange({ ...value, [tab]: text })}
          className="min-h-[280px] flex-1 text-sm"
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-3xl border-2 border-tint/10">
          <div className="border-b-2 border-tint/10 bg-tint/[0.03] px-4 py-2.5 text-sm font-black text-ink-muted">Preview</div>
          <iframe ref={iframeRef} title="Your page" sandbox="allow-scripts" srcDoc={doc} className="h-56 w-full bg-white" />
        </div>

        <div className="rounded-3xl border-2 border-tint/10 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-black text-ink-muted">
            <Target className="size-4" /> Goals
          </p>
          <ul className="space-y-1.5">
            {exercise.tests.map((test, i) => {
              const result = results?.[i];
              return (
                <li key={i} className="flex items-start gap-2 font-bold">
                  {result?.passed ? (
                    <CircleCheck className="mt-0.5 size-5 shrink-0 text-lime-400 light:text-lime-600" />
                  ) : result ? (
                    <CircleX className="mt-0.5 size-5 shrink-0 text-heart-500" />
                  ) : (
                    <span className="mt-1 size-4 shrink-0 rounded-full border-2 border-tint/20" />
                  )}
                  <span className={result && !result.passed ? 'text-heart-500' : 'text-ink-soft'}>{test.label}</span>
                </li>
              );
            })}
          </ul>
          {runtimeErrors.length > 0 && (
            <pre className="mt-3 overflow-x-auto rounded-xl bg-red-500/10 p-3 font-mono text-xs text-heart-500">{runtimeErrors.join('\n')}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
