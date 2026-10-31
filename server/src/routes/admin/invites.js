import crypto from 'node:crypto';
import { Router } from 'express';
import { clientUrl } from '../../config/env.js';
import Cohort from '../../models/Cohort.js';
import Course from '../../models/Course.js';
import Invite from '../../models/Invite.js';
import User from '../../models/User.js';
import { inviteEmail, sendMail } from '../../services/mail.js';
import { HttpError } from '../../utils/httpError.js';
import { inviteInput } from '../../utils/schemas.js';

const router = Router();

const inviteLink = (code) => `${clientUrl}/join/${code}`;
const withLink = (invite) => ({ ...invite.toJSON(), link: inviteLink(invite.code) });

router.get('/', async (_req, res) => {
  const invites = await Invite.find()
    .sort({ createdAt: -1 })
    .populate('courses', 'title emoji')
    .populate('cohorts', 'name')
    .populate('usedBy', 'name email');
  res.json({ invites: invites.map(withLink) });
});

router.post('/', async (req, res) => {
  const input = inviteInput.parse(req.body);

  const courses = await Course.find({ _id: { $in: input.courseIds } }).select('title emoji');
  if (courses.length !== new Set(input.courseIds).size) throw new HttpError(400, 'One of the courses no longer exists');
  const cohorts = await Cohort.find({ _id: { $in: input.cohortIds } });
  if (cohorts.length !== new Set(input.cohortIds).size) throw new HttpError(400, 'One of the cohorts no longer exists');
  if (cohorts.some((c) => !input.courseIds.includes(String(c.course)))) {
    throw new HttpError(400, 'A cohort was picked for a course that is not selected');
  }
  if (new Set(cohorts.map((c) => String(c.course))).size !== cohorts.length) {
    throw new HttpError(400, 'Pick at most one cohort per course');
  }
  if (input.email && (await User.exists({ email: input.email }))) {
    throw new HttpError(409, 'That email already has an account. Enrol them from the Students page instead.');
  }

  const invite = await Invite.create({
    code: crypto.randomBytes(6).toString('base64url'),
    name: input.name,
    email: input.email || undefined,
    courses: courses.map((c) => c._id),
    cohorts: cohorts.map((c) => c._id),
    expiresAt: new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000),
    createdBy: req.user._id,
  });
  await invite.populate([
    { path: 'courses', select: 'title emoji' },
    { path: 'cohorts', select: 'name' },
  ]);

  let emailSent = false;
  let emailError = null;
  if (input.sendEmail && input.email) {
    try {
      emailSent = await sendMail(
        inviteEmail({ to: input.email, name: input.name, link: inviteLink(invite.code), courseTitles: courses.map((c) => c.title) })
      );
      if (!emailSent) emailError = 'Email is not configured on the server';
    } catch (err) {
      console.error('[mail] invite failed:', err.message);
      emailError = 'The email could not be sent';
    }
  }

  res.status(201).json({ invite: withLink(invite), emailSent, emailError });
});

router.delete('/:id', async (req, res) => {
  const invite = await Invite.findById(req.params.id);
  if (!invite) throw new HttpError(404, 'Invite not found');
  if (invite.usedAt) throw new HttpError(400, "Used invites can't be deleted");
  await invite.deleteOne();
  res.status(204).end();
});

export default router;
