import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { ensureReferralCode } from '../services/accounts.js';
import { refreshStreak } from '../services/streak.js';
import { validTimezone } from '../utils/timezone.js';
import { signToken } from '../utils/token.js';
import { HttpError } from '../utils/httpError.js';
import { changePasswordInput, loginInput, profileInput } from '../utils/schemas.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = loginInput.parse(req.body);
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Wrong email or password');
  }
  res.json({ token: signToken(user), user });
});

router.get('/me', requireAuth, async (req, res) => {
  const streakChanged = refreshStreak(req.user);
  const codeAdded = await ensureReferralCode(req.user);
  if (streakChanged || codeAdded) await req.user.save();
  res.json({ user: req.user });
});

// Also used to replace the temporary password from the approval email
router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = changePasswordInput.parse(req.body);
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw new HttpError(400, 'Your current password is not right');
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.mustChangePassword = false;
  const timezone = validTimezone(req.body.timezone);
  if (timezone) user.timezone = timezone; // accounts created by an admin start with the default
  await user.save();
  res.json({ user });
});

router.patch('/me', requireAuth, async (req, res) => {
  const input = profileInput.parse(req.body);
  if (input.timezone) input.timezone = validTimezone(input.timezone) ?? req.user.timezone;
  req.user.set(input);
  await req.user.save();
  res.json({ user: req.user });
});

export default router;
