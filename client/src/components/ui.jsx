import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import Mascot from './Mascot';

export function Spinner({ className = 'size-5' }) {
  return <LoaderCircle className={`animate-spin ${className}`} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-grape-500">
      <Spinner className="size-8" />
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-10 text-center">
      <Mascot size={80} mood="sad" />
      <p className="font-bold text-slate-600">{error?.message ?? 'Something went wrong'}</p>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, mood = 'happy' }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-10 text-center">
      <Mascot size={88} mood={mood} />
      <h3 className="text-lg font-black">{title}</h3>
      {children}
    </div>
  );
}

export function ProgressBar({ value, color = 'var(--color-grape-500)', className = 'h-4' }) {
  return (
    <div className={`overflow-hidden rounded-full bg-slate-200 ${className}`}>
      <div
        className="relative h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
      >
        <span className="absolute inset-x-2 top-1 h-1 rounded-full bg-white/30" />
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 font-semibold text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Modal({ title, onClose, wide = false, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-grape-900/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={`max-h-[92dvh] w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** A button that asks "Sure?" on the first click and only acts on the second. */
export function ConfirmButton({ onConfirm, children, className = 'icon-btn', confirmLabel = 'Sure?', title }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef();

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleClick = () => {
    if (armed) {
      clearTimeout(timer.current);
      setArmed(false);
      onConfirm();
      return;
    }
    setArmed(true);
    timer.current = setTimeout(() => setArmed(false), 3000);
  };

  return (
    <button
      type="button"
      title={title}
      onClick={handleClick}
      className={armed ? 'btn btn-sm btn-danger' : className}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
