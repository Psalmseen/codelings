import { Router } from 'express';
import Invite from '../models/Invite.js';

const router = Router();

// Public: lets the join page show who the invite is for before sign-up
router.get('/:code', async (req, res) => {
  const invite = await Invite.findOne({ code: req.params.code }).populate('courses', 'title emoji');
  if (!invite || invite.status !== 'pending') return res.json({ valid: false });
  res.json({ valid: true, name: invite.name, email: invite.email ?? '', courses: invite.courses });
});

export default router;
