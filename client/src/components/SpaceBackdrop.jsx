import { useEffect, useRef } from 'react';

// Dark-mode scenery behind every page: starfield, nebula, a ringed planet, twinkles and the odd
// shooting star. Hidden in light mode; animations stop for people who prefer reduced motion.

const TWINKLES = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 37.3) % 100}%`,
  top: `${(i * 61.7) % 100}%`,
  delay: `${(i * 0.73) % 6}s`,
  duration: `${2.5 + ((i * 1.3) % 3)}s`,
  size: i % 5 === 0 ? 3 : 2,
}));

function drawStars(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const { innerWidth: w, innerHeight: h } = window;
  canvas.width = w * ratio;
  canvas.height = h * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  let seed = 42;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // same sky every time
  const count = Math.round((w * h) / 1600);
  for (let i = 0; i < count; i++) {
    const r = rand() < 0.92 ? rand() * 0.8 + 0.2 : rand() * 1.2 + 0.8;
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h, r, 0, Math.PI * 2);
    const tint = rand();
    ctx.fillStyle = tint < 0.7 ? `rgba(255,255,255,${0.35 + rand() * 0.6})` : tint < 0.85 ? `rgba(180,200,255,${0.5 + rand() * 0.4})` : `rgba(220,190,255,${0.5 + rand() * 0.4})`;
    if (r > 1.2) {
      ctx.shadowColor = 'rgba(180,200,255,0.9)';
      ctx.shadowBlur = 6;
    } else ctx.shadowBlur = 0;
    ctx.fill();
  }
}

export default function SpaceBackdrop() {
  const canvas = useRef(null);

  useEffect(() => {
    drawStars(canvas.current);
    let timer;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => drawStars(canvas.current), 150);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="space-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden light:hidden" aria-hidden="true">
      {/* Nebula */}
      <div className="absolute -top-1/4 -left-1/4 h-[80vh] w-[80vw] rounded-full bg-[radial-gradient(closest-side,rgb(124_58_237/0.35),transparent)] blur-3xl" />
      <div className="absolute top-[10%] -right-1/4 h-[70vh] w-[60vw] rounded-full bg-[radial-gradient(closest-side,rgb(47_107_255/0.28),transparent)] blur-3xl" />
      <div className="absolute -bottom-1/4 left-[20%] h-[60vh] w-[70vw] rounded-full bg-[radial-gradient(closest-side,rgb(192_38_211/0.18),transparent)] blur-3xl" />

      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />

      {TWINKLES.map((s, i) => (
        <span
          key={i}
          className="space-twinkle absolute rounded-full bg-white"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay, animationDuration: s.duration }}
        />
      ))}

      {/* A small distant planet */}
      <div className="absolute top-[14%] left-[7%] size-10 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffd29a,#e2763a_55%,#5a1f12)] opacity-80 shadow-[0_0_30px_rgb(255_150_80/0.35)] sm:size-14" />

      {/* Ringed planet, peeking in from the corner */}
      <div className="absolute -right-24 -bottom-28 size-64 sm:-right-28 sm:-bottom-32 sm:size-96">
        <div className="absolute top-1/2 left-1/2 h-[30%] w-[165%] -translate-x-1/2 -translate-y-1/2 -rotate-[18deg] rounded-[50%] border-[3px] border-[#a99bff]/35 shadow-[0_0_24px_rgb(150_130_255/0.25)]" />
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,#8f7bff,#4b3bd1_40%,#1c1460_75%,#0a0726)] shadow-[0_0_90px_rgb(110_90_255/0.4),inset_-30px_-30px_60px_rgb(0_0_0/0.55)]" />
        {/* Front half of the ring passes over the planet */}
        <div className="absolute top-1/2 left-1/2 h-[30%] w-[165%] -translate-x-1/2 -translate-y-1/2 -rotate-[18deg] rounded-[50%] border-[3px] border-transparent border-b-[#c4b8ff]/55" />
      </div>

      <span className="space-shooting-star absolute top-[12%] left-[55%] h-px w-40" />
    </div>
  );
}
