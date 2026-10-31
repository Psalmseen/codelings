import cron from 'node-cron';
import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { ensureAdmin } from './services/bootstrap.js';
import { runScheduledJobs } from './services/jobs.js';

async function runJobs() {
  try {
    const { sent } = await runScheduledJobs();
    if (sent) console.log(`[reminders] sent ${sent} streak reminder(s)`);
  } catch (err) {
    console.error('[jobs] scheduled run failed:', err);
  }
}

await connectDb();
await ensureAdmin();
createApp().listen(env.PORT, () => {
  console.log(`Codelings API running on http://localhost:${env.PORT}`);
});

// Hourly: close finished league weeks and email students for whom it's now 7pm with a streak
// at risk. On hosts that sleep when idle, an external scheduler calls /api/cron/run as well.
await runJobs();
cron.schedule('0 * * * *', runJobs);
