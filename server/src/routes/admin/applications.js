import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { clientUrl } from '../../config/env.js';
import Application from '../../models/Application.js';
import Cohort from '../../models/Cohort.js';
import Course from '../../models/Course.js';
import Enrollment from '../../models/Enrollment.js';
import User from '../../models/User.js';
import { generateReferralCode, generateTempPassword } from '../../services/accounts.js';
import { approvedEmail, rejectedEmail, sendMail } from '../../services/mail.js';
import { HttpError } from '../../utils/httpError.js';
import { approveInput, rejectInput } from '../../utils/schemas.js';

const router = Router();

async function loadPending(id) {
  const application = await Application.findById(id);
  if (!application) throw new HttpError(404, 'Application not found');
  if (application.status !== 'pending') throw new HttpError(400, `This application was already ${application.status}`);
  return application;
}

router.get('/', async (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  const [applications, counts] = await Promise.all([
    Application.find({ status }).sort({ createdAt: status === 'pending' ? 1 : -1 }).limit(200).populate('referredBy', 'name').populate('reviewedBy', 'name'),
    Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  res.json({ applications, counts: Object.fromEntries(counts.map((c) => [c._id, c.count])) });
});

router.post('/:id/approve', async (req, res) => {
  const application = await loadPending(req.params.id);
  const { courseIds, cohortIds } = approveInput.parse(req.body);

  const courses = await Course.find({ _id: { $in: courseIds } }).select('title');
  if (courses.length !== new Set(courseIds).size) throw new HttpError(400, 'One of the courses no longer exists');
  const cohorts = await Cohort.find({ _id: { $in: cohortIds } }).select('course');
  if (cohorts.length !== new Set(cohortIds).size) throw new HttpError(400, 'One of the cohorts no longer exists');
  if (cohorts.some((c) => !courseIds.includes(String(c.course)))) throw new HttpError(400, 'A cohort was picked for a course that is not selected');
  if (new Set(cohorts.map((c) => String(c.course))).size !== cohorts.length) throw new HttpError(400, 'Pick at most one cohort per course');
  if (await User.exists({ email: application.email })) throw new HttpError(409, 'An account with this email already exists');

  // Claim the application atomically so a double click can't create two accounts
  const claimed = await Application.findOneAndUpdate(
    { _id: application._id, status: 'pending' },
    { status: 'approved', reviewedAt: new Date(), reviewedBy: req.user._id },
    { new: true }
  );
  if (!claimed) throw new HttpError(400, 'This application was already reviewed');

  const tempPassword = generateTempPassword();
  let user;
  try {
    user = await User.create({
      name: application.name,
      email: application.email,
      phone: application.phone,
      passwordHash: await bcrypt.hash(tempPassword, 10),
      mustChangePassword: true,
      referralCode: await generateReferralCode(application.name),
      referredBy: application.referredBy,
      application: application._id,
      timezone: application.timezone || undefined,
    });
  } catch (err) {
    await Application.updateOne({ _id: application._id }, { status: 'pending', reviewedAt: null, reviewedBy: null });
    throw err;
  }
  await Promise.all([
    Application.updateOne({ _id: application._id }, { user: user._id }),
    courses.length &&
      Enrollment.insertMany(courses.map((course) => ({ user: user._id, course: course._id, cohort: cohorts.find((c) => c.course.equals(course._id))?._id ?? null }))),
  ]);

  let emailSent = false;
  let emailError = null;
  try {
    emailSent = await sendMail(
      approvedEmail({ to: user.email, name: user.name, tempPassword, loginLink: `${clientUrl}/login`, courseTitles: courses.map((c) => c.title) })
    );
    if (!emailSent) emailError = 'Email is not configured on the server';
  } catch (err) {
    console.error('[mail] approval email failed:', err.message);
    emailError = 'The email could not be sent';
  }

  // The temporary password is returned once, so the admin can pass it on if the email didn't arrive
  res.json({ student: { _id: user._id, name: user.name, email: user.email, phone: user.phone }, tempPassword, emailSent, emailError });
});

router.post('/:id/reject', async (req, res) => {
  const application = await loadPending(req.params.id);
  const { note } = rejectInput.parse(req.body);
  application.set({ status: 'rejected', rejectionNote: note, reviewedAt: new Date(), reviewedBy: req.user._id });
  await application.save();

  let emailSent = false;
  try {
    emailSent = await sendMail(rejectedEmail({ to: application.email, name: application.name, note }));
  } catch (err) {
    console.error('[mail] rejection email failed:', err.message);
  }
  res.json({ ok: true, emailSent });
});

export default router;
