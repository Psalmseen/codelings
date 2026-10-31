export const MAX_FREEZES = 2;
const FREEZE_EVERY_DAYS = 7;

/** Today's date as YYYY-MM-DD in the given timezone. */
export function localDate(timezone, date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function addDays(ymd, days) {
  const date = new Date(`${ymd}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

/**
 * Handles missed days: streak freezes cover them if there are enough, otherwise the
 * streak resets. Returns true if the user changed (caller saves).
 */
export function refreshStreak(user, now = new Date()) {
  const today = localDate(user.timezone, now);
  const last = user.streak.lastActiveOn;
  if (!last || user.streak.current === 0) return false;

  const missed = daysBetween(last, today) - 1;
  if (missed <= 0) return false;

  if (user.streak.freezes >= missed) {
    user.streak.freezes -= missed;
    user.streak.lastActiveOn = addDays(today, -1);
    user.notices.push({ type: 'freeze_used', data: { used: missed, streak: user.streak.current } });
  } else {
    user.streak.current = 0;
  }
  return true;
}

/**
 * Counts today as active. `extended` is true on the first activity of the day;
 * `freezeEarned` when that took the streak to a multiple of 7 days.
 */
export function recordActivity(user, now = new Date()) {
  const today = localDate(user.timezone, now);
  const last = user.streak.lastActiveOn;
  if (last === today) return { extended: false, freezeEarned: false };

  user.streak.current = last === addDays(today, -1) ? user.streak.current + 1 : 1;
  user.streak.longest = Math.max(user.streak.longest, user.streak.current);
  user.streak.lastActiveOn = today;

  const freezeEarned = user.streak.current % FREEZE_EVERY_DAYS === 0 && user.streak.freezes < MAX_FREEZES;
  if (freezeEarned) user.streak.freezes += 1;
  return { extended: true, freezeEarned };
}
