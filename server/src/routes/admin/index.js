import { Router } from 'express';
import Course from '../../models/Course.js';
import Invite from '../../models/Invite.js';
import User from '../../models/User.js';
import { clientUrl } from '../../config/env.js';
import { requireAdmin, requireAuth } from '../../middleware/auth.js';
import { sendMail, streakReminderEmail } from '../../services/mail.js';
import { studentsAtRisk } from '../../services/reminders.js';
import analytics from './analytics.js';
import courses from './courses.js';
import invites from './invites.js';
import lessons from './lessons.js';
import students from './students.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/stats', async (_req, res) => {
  const now = new Date();
  const [students, courses, publishedCourses, pendingInvites, activeToday] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Course.countDocuments(),
    Course.countDocuments({ status: 'published' }),
    Invite.countDocuments({ usedAt: null, expiresAt: { $gt: now } }),
    User.countDocuments({ role: 'student', lastSeenAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) } }),
  ]);
  res.json({ students, courses, publishedCourses, pendingInvites, activeToday });
});

router.get('/at-risk', async (_req, res) => {
  res.json({ students: await studentsAtRisk() });
});

// Sends a sample streak reminder to the admin, to check email settings
router.post('/reminders/test', async (req, res) => {
  let sent = false;
  try {
    sent = await sendMail(
      streakReminderEmail({
        to: req.user.email,
        name: req.user.name,
        streak: 12,
        freezes: 1,
        courseTitle: 'HTML Basics',
        lessonTitle: 'Headings & paragraphs',
        link: `${clientUrl}/learn`,
        settingsLink: `${clientUrl}/learn/profile`,
      })
    );
  } catch (err) {
    return res.status(502).json({ error: `Email failed: ${err.message}` });
  }
  if (!sent) return res.status(503).json({ error: 'Email is not configured on the server (set BREVO_API_KEY, or SMTP_* settings)' });
  res.json({ sent: true, to: req.user.email });
});

router.use('/analytics', analytics);
router.use('/courses', courses);
router.use('/lessons', lessons);
router.use('/invites', invites);
router.use('/students', students);

export default router;
