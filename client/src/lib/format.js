export function timeAgo(date) {
  if (!date) return 'never';
  const seconds = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const [unit, size] = units.find(([, size]) => seconds >= size);
  const value = Math.floor(seconds / size);
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
}

export const firstName = (name = '') => name.trim().split(/\s+/)[0];

export const percent = (part, total) => (total ? Math.round((part / total) * 100) : 0);

/** Darkens a #rrggbb colour, used for the chunky 3D button shadows. */
export function darken(hex, amount = 0.22) {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift) => Math.round(((n >> shift) & 255) * (1 - amount));
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

/** Converts YouTube / Vimeo links to an embeddable URL, or returns null. */
export function videoEmbedUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtube.com' && u.searchParams.get('v')) return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    if (host === 'youtube.com' && u.pathname.startsWith('/embed/')) return url;
    if (host === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`;
    if (host === 'vimeo.com' && /^\/\d+/.test(u.pathname)) return `https://player.vimeo.com/video${u.pathname}`;
  } catch {
    // not a URL
  }
  return null;
}

/** Rough time until `date`: "3 days", "5 hours", "12 minutes". */
export function timeUntil(date) {
  const seconds = Math.max(0, Math.round((new Date(date).getTime() - Date.now()) / 1000));
  const units = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const [unit, size] = units.find(([, size]) => seconds >= size) ?? ['minute', 60];
  const value = Math.max(1, Math.floor(seconds / size));
  return `${value} ${unit}${value === 1 ? '' : 's'}`;
}

export const formatDate = (date) =>
  new Date(date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/** Today's date (YYYY-MM-DD) in a timezone, matching how the server stores streak days. */
export const todayIn = (timezone) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
