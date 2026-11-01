import { useId } from 'react';

// "Bit", the Codelings mascot: a round little code bug with a neon glow.
export default function Mascot({ size = 96, mood = 'happy', className = '' }) {
  const id = useId(); // gradient ids must be unique when several mascots are on screen
  const ink = '#0B1440';
  const mouths = {
    happy: <path d="M50 80 Q60 90 70 80" stroke={ink} strokeWidth="5" fill="none" strokeLinecap="round" />,
    excited: <path d="M48 78 Q60 96 72 78 Z" fill={ink} />,
    sad: <path d="M50 86 Q60 78 70 86" stroke={ink} strokeWidth="5" fill="none" strokeLinecap="round" />,
  };

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      style={{ filter: 'drop-shadow(0 0 14px rgb(47 107 255 / 0.55))' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2F6BFF" />
          <stop offset="100%" stopColor="#FF2BD6" />
        </linearGradient>
      </defs>
      <path d="M45 32 Q38 14 28 12M75 32 Q82 14 92 12" stroke="#85A6FF" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="28" cy="12" r="7" fill="#5CF2FF" style={{ filter: 'drop-shadow(0 0 6px #5CF2FF)' }} />
      <circle cx="92" cy="12" r="7" fill="#5CF2FF" style={{ filter: 'drop-shadow(0 0 6px #5CF2FF)' }} />
      <path d="M26 96 L16 108M94 96 L104 108" stroke="#85A6FF" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="60" cy="70" rx="42" ry="40" fill={`url(#${id}-body)`} />
      <ellipse cx="60" cy="94" rx="24" ry="12" fill="#fff" opacity=".18" />
      <text x="60" y="100" textAnchor="middle" fontSize="13" fontWeight="900" fill="#EEF3FF" fontFamily="monospace">
        {'</>'}
      </text>
      <circle cx="45" cy="58" r="13" fill="#fff" />
      <circle cx="75" cy="58" r="13" fill="#fff" />
      <circle cx="47" cy="60" r="6.5" fill={ink} />
      <circle cx="77" cy="60" r="6.5" fill={ink} />
      <circle cx="49.5" cy="57" r="2.2" fill="#fff" />
      <circle cx="79.5" cy="57" r="2.2" fill="#fff" />
      <circle cx="31" cy="76" r="5" fill="#FF8AF0" opacity=".8" />
      <circle cx="89" cy="76" r="5" fill="#FF8AF0" opacity=".8" />
      {mouths[mood] ?? mouths.happy}
    </svg>
  );
}

export function Logo({ size = 36, admin = false }) {
  return (
    <span className="flex items-center gap-2">
      <Mascot size={size} />
      <span className="bg-linear-to-r from-neon-300 to-plasma-400 bg-clip-text light:from-neon-600 light:to-plasma-600 text-xl font-black tracking-tight text-transparent">codelings</span>
      {admin && <span className="badge bg-neon-500/20 text-neon-300 light:text-neon-700">Admin</span>}
    </span>
  );
}
