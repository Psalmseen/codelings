// Reaching level L takes 25 * L * (L - 1) total XP: 0, 50, 150, 300, 500, ...
export function xpForLevel(level) {
  return 25 * level * (level - 1);
}

export function levelInfo(xp = 0) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const start = xpForLevel(level);
  return { level, xpIntoLevel: xp - start, xpForNext: xpForLevel(level + 1) - start };
}
