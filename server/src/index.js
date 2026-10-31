import cron from 'node-cron';
import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { ensureAdmin } from './services/bootstrap.js';
import { closeFinishedWeeks } from './services/league.js';
import { sendStreakReminders } from './services/reminders.js';

async function settleLeagues() {
  try {
    await closeFinishedWeeks();
  } catch (err) {
    console.error('[league] closing weeks failed:', err);
  }
}

await connectDb();
await ensureAdmin();
createApp().listen(env.PORT, () => {
  console.log(`Codelings API running on http://localhost:${env.PORT}`);
});

// Weeks close lazily too (when someone opens the league page), so a sleeping server catches up
await settleLeagues();
cron.schedule('5 * * * *', settleLeagues);

// Every hour, email students for whom it's now 7pm and whose streak is at risk
cron.schedule('0 * * * *', async () => {
  try {
    const { sent } = await sendStreakReminders();
    if (sent) console.log(`[reminders] sent ${sent} streak reminder(s)`);
  } catch (err) {
    console.error('[reminders] run failed:', err);
  }
});
