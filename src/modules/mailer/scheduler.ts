import type { Database } from "bun:sqlite";
import { mailService } from "./service";

let timer: NodeJS.Timeout | null = null;

/**
 * Starts background scheduler for checking and sending favorite tag meeting reminders.
 * Checks hourly by default (or every checkIntervalMs).
 */
export function startMailerScheduler(database: Database, checkIntervalMs = 60 * 60 * 1000) {
  if (timer) clearInterval(timer);

  // Run on startup
  mailService.sendFavoriteTagMeetReminders(database).catch((err) => {
    console.error("[Mailer Scheduler] Error checking reminders on startup:", err);
  });

  // Schedule periodic checks
  timer = setInterval(() => {
    mailService.sendFavoriteTagMeetReminders(database).catch((err) => {
      console.error("[Mailer Scheduler] Error checking reminders:", err);
    });
  }, checkIntervalMs);

  return timer;
}

export function stopMailerScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
