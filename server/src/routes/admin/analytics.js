import { Router } from 'express';
import User from '../../models/User.js';
import { classAnalytics, studentAnalytics, studentAnswersCsv, studentsCsv } from '../../services/analytics.js';
import { HttpError } from '../../utils/httpError.js';

const router = Router();

function sendCsv(res, filename, csv) {
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"` });
  res.send(csv);
}

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'student';
const today = () => new Date().toISOString().slice(0, 10);

router.get('/overview', async (_req, res) => {
  res.json(await classAnalytics());
});

router.get('/students.csv', async (_req, res) => {
  sendCsv(res, `codelings-students-${today()}.csv`, await studentsCsv());
});

router.get('/students/:id', async (req, res) => {
  const stats = await studentAnalytics(req.params.id);
  if (!stats) throw new HttpError(404, 'Student not found');
  res.json(stats);
});

router.get('/students/:id/answers.csv', async (req, res) => {
  const student = await User.findById(req.params.id).select('name');
  if (!student) throw new HttpError(404, 'Student not found');
  sendCsv(res, `codelings-${slug(student.name)}-answers-${today()}.csv`, await studentAnswersCsv(student._id));
});

export default router;
