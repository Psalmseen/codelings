import { closeFinishedWeeks } from './league.js';
import { sendStreakReminders } from './reminders.js';

let running = null;

/**
 * Closes finished league weeks and sends due streak reminders. Called by the in-process
 * hourly cron and by the external scheduler (/api/cron/run). Overlapping calls share one
 * run, so a reminder can't be sent twice.
 */
export function runScheduledJobs() {
  running ??= (async () => {
    try {
      await closeFinishedWeeks();
      return await sendStreakReminders();
    } finally {
      running = null;
    }
  })();
  return running;
}
