import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';
import adminRoutes from './routes/admin/index.js';
import authRoutes from './routes/auth.js';
import inviteRoutes from './routes/invites.js';
import learnRoutes from './routes/learn.js';

// In production the built React app is served by this same server
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');

// Slows down password guessing on sign-in / sign-up
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // behind the host's load balancer
  app.use(cors({ origin: env.CLIENT_URLS }));
  app.use(express.json({ limit: '2mb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/invites', inviteRoutes);
  app.use('/api/learn', learnRoutes);
  app.use('/api/admin', adminRoutes);

  if (fs.existsSync(clientDist)) {
    // Hashed build assets never change, so they can be cached for a long time
    app.use('/assets', express.static(path.join(clientDist, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    // Every other page is handled by the React router
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
