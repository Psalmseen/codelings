import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError.js';

export function notFound(_req, res) {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: err.issues[0]?.message ?? 'Invalid input',
      details: err.issues.map((issue) => ({ path: issue.path, message: issue.message })),
    });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid id' });
  if (err.code === 11000) return res.status(409).json({ error: 'That already exists' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });

  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
}
