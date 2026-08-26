import type { Database } from "bun:sqlite";
import { mailService } from "./service";
import type { EmailAutomationRuleRow } from "./database";

let timer: NodeJS.Timeout | null = null;

/**
 * Checks if current time in target timezone is at or after scheduled time string "HH:MM".
 * Defaults to Tehran timezone ("Asia/Tehran").
 */
export function isTimeToRun(sendTimeStr = "06:00", timeZone = "Asia/Tehran"): boolean {
  try {
    const parts = sendTimeStr.split(":").map(Number);
    const targetHour = isNaN(parts[0]) ? 6 : parts[0];
    const targetMinute = isNaN(parts[1]) ? 0 : parts[1];

    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const [currentHour, currentMinute] = formatter.format(now).split(":").map(Number);

    if (currentHour > targetHour) return true;
    if (currentHour === targetHour && currentMinute >= targetMinute) return true;
    return false;
  } catch {
    return true;
  }
}

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

        const sendTime = typeof config.send_time === "string" ? config.send_time : "06:00";

        if (rule.rule_key === "tag_reminder") {
          const daysAhead = typeof config.days_ahead === "number" ? config.days_ahead : 1;
          const templateTitle = rule.template_title || undefined;
          await mailService.sendFavoriteTagMeetReminders(database, daysAhead, undefined, templateTitle, sendTime);
          database.run("UPDATE email_automation_rules SET last_run_at = CURRENT_TIMESTAMP WHERE id = ?", [rule.id]);
        } else if (rule.rule_key === "rsvp_reminder") {
          const daysAhead = typeof config.days_ahead === "number" ? config.days_ahead : 0;
          const templateTitle = rule.template_title || undefined;

          const upcomingMeets = database
            .query<{ id: string }, []>(
              `SELECT id FROM meets
               WHERE status = 'upcoming' AND deleted_at IS NULL`
            )
            .all();

          for (const { id } of upcomingMeets) {
            await mailService.sendMeetAttendeesReminder(database, id, undefined, templateTitle, daysAhead, sendTime);
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
