import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { clientUrl } from '../config/env.js';
import Application from '../models/Application.js';
import User from '../models/User.js';
import { findReferrer } from '../services/accounts.js';
import { applicationReceivedEmail, newApplicationEmail, sendMail } from '../services/mail.js';
import { HttpError } from '../utils/httpError.js';
import { applyInput } from '../utils/schemas.js';
import { validTimezone } from '../utils/timezone.js';

const router = Router();

const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many applications from this connection. Please try again later.' },
});

/** Sends an email without letting a mail problem fail the request. */
async function trySend(message) {
  try {
    await sendMail(message);
  } catch (err) {
    console.error(`[mail] "${message.subject}" to ${message.to} failed:`, err.message);
  }
}

// Shows "Referred by Tolu" on the form when someone arrives through a referral link
router.get('/referral/:code', async (req, res) => {
  const referrer = await findReferrer(req.params.code);
  res.json(referrer ? { valid: true, referrerName: referrer.name.split(' ')[0] } : { valid: false });
});

router.post('/', applyLimiter, async (req, res) => {
  // Honeypot: a hidden field people never see, but form-filling bots do. Pretend it worked.
  if (req.body?.website) return res.status(201).json({ ok: true });

  const input = applyInput.parse(req.body);
  if (await User.exists({ email: input.email })) {
    throw new HttpError(409, 'An account with this email already exists. Try signing in instead.');
  }
  if (await Application.exists({ email: input.email, status: 'pending' })) {
    throw new HttpError(409, "You've already applied with this email. We'll be in touch soon!");
  }

  const referrer = await findReferrer(input.referralCode);
  if (input.referralCode && !referrer) {
    throw new HttpError(400, "We couldn't find that referral code. Check it, or leave it empty.");
  }

  const application = await Application.create({
    ...input,
    referralCode: referrer ? referrer.referralCode : '',
    referredBy: referrer?._id ?? null,
    dateOfBirth: input.dateOfBirth || null,
    timezone: validTimezone(input.timezone) ?? '',
  });

  const admins = await User.find({ role: 'admin' }).select('email');
  await Promise.all([
    trySend(applicationReceivedEmail({ to: application.email, name: application.name })),
    ...admins.map((admin) =>
      trySend(
        newApplicationEmail({
          to: admin.email,
          applicant: { name: application.name, email: application.email, phone: application.phone, referrerName: referrer?.name },
          reviewLink: `${clientUrl}/admin/applications`,
        })
      )
    ),
  ]);

  res.status(201).json({ ok: true });
});

export default router;
