import type { Database } from "bun:sqlite";
import { mailService } from "./service";

let timer: NodeJS.Timeout | null = null;

/**
 * Starts background scheduler for checking and sending favorite tag meeting reminders
 * and pending scheduled email jobs.
 * Checks every intervalMs (default: 60s).
 */
export function startMailerScheduler(
  database: Database,
  checkIntervalMs = Number(process.env.MAILER_SCHEDULER_INTERVAL_MS ?? 60000)
) {
  if (timer) clearInterval(timer);

  const runSchedulerTick = async () => {
    try {
      await mailService.sendFavoriteTagMeetReminders(database);
      await mailService.processScheduledEmails(database);
    } catch (err) {
      console.error("[Mailer Scheduler] Error executing scheduler tick:", err);
    }
  };

  // Run on startup
  runSchedulerTick();

  // Schedule periodic checks with unref() so event loop does not hang on exit/tests
  timer = setInterval(runSchedulerTick, checkIntervalMs);
  if (timer && typeof timer.unref === "function") {
    timer.unref();
  }

  return timer;
}

export function stopMailerScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
