import { useState } from 'react';
import { Heart, Volume2, VolumeX, X } from 'lucide-react';
import { isMuted, setMuted } from '../../lib/sound';
import { ProgressBar } from '../ui';

function MuteToggle() {
  const [muted, setMutedState] = useState(isMuted);
  const toggle = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };
  return (
    <button className="icon-btn" onClick={toggle} aria-label={muted ? 'Turn sound on' : 'Turn sound off'}>
      {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
    </button>
  );
}

/** Full-screen frame for lessons and practice: close button, progress bar, hearts, fixed footer. */
export default function PlayerShell({ progress, hearts, onClose, footer, wide = false, children }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-4">
        <button className="icon-btn" onClick={onClose} aria-label="Close">
          <X className="size-6" strokeWidth={3} />
        </button>
        <div className="flex-1">{progress !== undefined && <ProgressBar value={progress * 100} color="var(--color-lime-500)" />}</div>
        <MuteToggle />
        {hearts !== null && hearts !== undefined && (
          <span className={`flex items-center gap-1 text-lg font-black ${hearts > 0 ? 'text-heart-500' : 'text-ink-ghost'}`} title="Hearts">
            <Heart className="size-6" fill="currentColor" /> {hearts}
          </span>
        )}
      </header>
      <main className="flex-1 px-4 pt-4 pb-44">
        <div className={`mx-auto w-full ${wide ? 'max-w-6xl' : 'max-w-2xl'}`}>{children}</div>
      </main>
      {footer && <footer className="fixed inset-x-0 bottom-0 z-30">{footer}</footer>}
    </div>
  );
}

/** Standard footer bar; `tone` colours it for correct / wrong feedback. */
export function PlayerFooter({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'border-tint/10 glass-strong',
    correct: 'border-lime-400/40 bg-lime-950/90 light:bg-lime-50/95 backdrop-blur-xl shadow-[0_-10px_40px_rgb(163_230_53/0.15)]',
    wrong: 'border-red-500/40 bg-red-950/90 light:bg-red-50/95 backdrop-blur-xl shadow-[0_-10px_40px_rgb(255_77_109/0.15)]',
  };
  return (
    <div className={`border-t-2 ${tones[tone]}`}>
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center">{children}</div>
    </div>
  );
}
