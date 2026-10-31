import { Router } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Invite from '../models/Invite.js';
import Cohort from '../models/Cohort.js';
import Enrollment from '../models/Enrollment.js';
import { requireAuth } from '../middleware/auth.js';
import { refreshStreak } from '../services/streak.js';
import { signToken } from '../utils/token.js';
import { HttpError } from '../utils/httpError.js';
import { loginInput, profileInput, registerInput } from '../utils/schemas.js';

const router = Router();

function validTimezone(timezone) {
  if (!timezone) return undefined;
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
    return timezone;
  } catch {
    return undefined;
  }
}

router.post('/login', async (req, res) => {
  const { email, password } = loginInput.parse(req.body);
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Wrong email or password');
  }
  res.json({ token: signToken(user), user });
});

router.post('/register', async (req, res) => {
  const input = registerInput.parse(req.body);

  const invite = await Invite.findOne({ code: input.code });
  if (!invite || invite.status !== 'pending') {
    throw new HttpError(400, 'This invite link is invalid, expired or already used');
  }
  if (invite.email && invite.email !== input.email) {
    throw new HttpError(400, 'This invite was sent to a different email address');
  }
  if (await User.exists({ email: input.email })) {
    throw new HttpError(409, 'An account with this email already exists. Try signing in.');
  }

  // Claim the invite atomically so two sign-ups can't share it
  const userId = new mongoose.Types.ObjectId();
  const claimed = await Invite.findOneAndUpdate(
    { _id: invite._id, usedAt: null },
    { usedAt: new Date(), usedBy: userId }
  );
  if (!claimed) throw new HttpError(400, 'This invite has already been used');

  let user;
  try {
    user = await User.create({
      _id: userId,
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 10),
      timezone: validTimezone(input.timezone),
    });
  } catch (err) {
    await Invite.updateOne({ _id: invite._id }, { usedAt: null, usedBy: null });
    throw err;
  }

  if (invite.courses.length) {
    const cohorts = await Cohort.find({ _id: { $in: invite.cohorts } }).select('course');
    await Enrollment.insertMany(
      invite.courses.map((course) => ({ user: user._id, course, cohort: cohorts.find((c) => c.course.equals(course))?._id ?? null }))
    );
  }

  res.status(201).json({ token: signToken(user), user });
});

router.get('/me', requireAuth, async (req, res) => {
  if (refreshStreak(req.user)) await req.user.save();
  res.json({ user: req.user });
});

router.patch('/me', requireAuth, async (req, res) => {
  const input = profileInput.parse(req.body);
  if (input.timezone) input.timezone = validTimezone(input.timezone) ?? req.user.timezone;
  req.user.set(input);
  await req.user.save();
  res.json({ user: req.user });
});

export default router;
