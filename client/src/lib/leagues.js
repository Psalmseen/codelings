// League tiers, lowest first. The server only stores the index (0–7).
export const TIERS = [
  { name: 'Hello World', emoji: '👋', color: '#94A3B8' },
  { name: 'Variable', emoji: '📦', color: '#22C55E' },
  { name: 'Loop', emoji: '🔁', color: '#0EA5E9' },
  { name: 'Function', emoji: '⚙️', color: '#6D4AFF' },
  { name: 'Object', emoji: '🧱', color: '#F97316' },
  { name: 'Algorithm', emoji: '🧠', color: '#EC4899' },
  { name: 'Architect', emoji: '🏛️', color: '#14B8A6' },
  { name: 'Legend', emoji: '👑', color: '#EAB308' },
];

export const tierOf = (index = 0) => TIERS[Math.min(Math.max(index, 0), TIERS.length - 1)];
