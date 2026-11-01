import User from '../models/User.js';
import { verifyToken } from '../utils/token.js';

const SEEN_THROTTLE_MS = 5 * 60 * 1000;

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please sign in' });

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: 'Your session has expired, please sign in again' });
  }

  const user = await User.findById(payload.sub);
  if (!user) return res.status(401).json({ error: 'Please sign in' });

  if (!user.lastSeenAt || Date.now() - user.lastSeenAt.getTime() > SEEN_THROTTLE_MS) {
    User.updateOne({ _id: user._id }, { lastSeenAt: new Date() }).catch(() => {});
  }

  // Students signing in with an emailed temporary password must choose their own first
  const allowed = req.originalUrl.startsWith('/api/auth/me') || req.originalUrl.startsWith('/api/auth/change-password');
  if (user.mustChangePassword && !allowed) {
    return res.status(403).json({ error: 'Please choose a new password first', code: 'PASSWORD_CHANGE_REQUIRED' });
  }

  req.user = user;
  next();
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  next();
}
