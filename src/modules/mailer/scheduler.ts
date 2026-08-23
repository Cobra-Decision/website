import type { Database } from "bun:sqlite";
import { mailService } from "./service";
import type { EmailAutomationRuleRow } from "./database";

let timer: NodeJS.Timeout | null = null;

/**
 * Starts background scheduler for checking and executing active email automation rules
 * and pending scheduled email broadcast jobs.
 * Checks every intervalMs (default: 60s).
 */
export function startMailerScheduler(
  database: Database,
  checkIntervalMs = Number(process.env.MAILER_SCHEDULER_INTERVAL_MS ?? 60000)
) {
  if (timer) clearInterval(timer);

  const runSchedulerTick = async () => {
    try {
      // 1. Process one-time scheduled broadcast queue
      await mailService.processScheduledEmails(database);

      // 2. Fetch active automation rules
      const activeRules = database
        .query<EmailAutomationRuleRow, []>(
          "SELECT * FROM email_automation_rules WHERE is_enabled = 1 AND deleted_at IS NULL"
        )
        .all();

      for (const rule of activeRules) {
        let config: any = {};
        try {
          config = JSON.parse(rule.schedule_config || "{}");
        } catch {}

        if (rule.rule_key === "tag_reminder") {
          const daysAhead = typeof config.days_ahead === "number" ? config.days_ahead : 1;
          await mailService.sendFavoriteTagMeetReminders(database, daysAhead);
          database.run("UPDATE email_automation_rules SET last_run_at = CURRENT_TIMESTAMP WHERE id = ?", [rule.id]);
        } else if (rule.rule_key === "rsvp_reminder") {
          const daysAhead = typeof config.days_ahead === "number" ? config.days_ahead : 0;
          const target = new Date();
          target.setDate(target.getDate() + daysAhead);
          const targetDateStr = target.toISOString().slice(0, 10);

          const upcomingMeets = database
            .query<{ id: string }, [string]>(
              `SELECT id FROM meets
               WHERE scheduled_date = ? AND status = 'upcoming' AND deleted_at IS NULL`
            )
            .all(targetDateStr);

          for (const { id } of upcomingMeets) {
            await mailService.sendMeetAttendeesReminder(database, id);
          }
          database.run("UPDATE email_automation_rules SET last_run_at = CURRENT_TIMESTAMP WHERE id = ?", [rule.id]);
        }
      }
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
