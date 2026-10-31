// "Bit", the Codelings mascot: a round little code bug.
export default function Mascot({ size = 96, mood = 'happy', className = '' }) {
  const mouths = {
    happy: <path d="M50 80 Q60 90 70 80" stroke="#1E1B4B" strokeWidth="5" fill="none" strokeLinecap="round" />,
    excited: <path d="M48 78 Q60 96 72 78 Z" fill="#1E1B4B" />,
    sad: <path d="M50 86 Q60 78 70 86" stroke="#1E1B4B" strokeWidth="5" fill="none" strokeLinecap="round" />,
  };

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden="true">
      <path d="M45 32 Q38 14 28 12M75 32 Q82 14 92 12" stroke="#3B2A99" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="28" cy="12" r="7" fill="#A3E635" />
      <circle cx="92" cy="12" r="7" fill="#A3E635" />
      <path d="M26 96 L16 108M94 96 L104 108" stroke="#3B2A99" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="60" cy="70" rx="42" ry="40" fill="#6D4AFF" />
      <ellipse cx="60" cy="94" rx="24" ry="12" fill="#8F75FF" />
      <text x="60" y="100" textAnchor="middle" fontSize="13" fontWeight="900" fill="#ECE8FF" fontFamily="monospace">
        {'</>'}
      </text>
      <circle cx="45" cy="58" r="13" fill="#fff" />
      <circle cx="75" cy="58" r="13" fill="#fff" />
      <circle cx="47" cy="60" r="6.5" fill="#1E1B4B" />
      <circle cx="77" cy="60" r="6.5" fill="#1E1B4B" />
      <circle cx="49.5" cy="57" r="2.2" fill="#fff" />
      <circle cx="79.5" cy="57" r="2.2" fill="#fff" />
      <circle cx="31" cy="76" r="5" fill="#FF8FB1" opacity=".75" />
      <circle cx="89" cy="76" r="5" fill="#FF8FB1" opacity=".75" />
      {mouths[mood] ?? mouths.happy}
    </svg>
  );
}

export function Logo({ size = 36, admin = false }) {
  return (
    <span className="flex items-center gap-2">
      <Mascot size={size} />
      <span className="text-xl font-black tracking-tight text-grape-600">codelings</span>
      {admin && <span className="badge bg-grape-100 text-grape-600">Admin</span>}
    </span>
  );
}
