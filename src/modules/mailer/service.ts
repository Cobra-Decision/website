import type { Database } from "bun:sqlite";
import { RingBuffer } from "./ring-buffer";
import { FallbackProvider, SmtpProvider } from "./providers";
import {
  renderAttendanceConfirmationTemplate,
  renderAttendeesReminderTemplate,
  renderOtpEmailTemplate,
  renderTagReminderTemplate,
  renderWelcomeTemplate,
  wrapEmailContainer,
  interpolateVariables,
  getShamsiToday,
  normalizeBaseUrl,
  type MeetEmailData,
} from "./templates";
import { renderMarkdown } from "../../lib/markdown";
import type { BatchFilterOptions, EmailMessage, EmailPayload, EmailProvider, MailerStats } from "./types";
import { generateId } from "../../lib/id";
import { logger } from "../../lib/logger";

export class MailService {
  private static instance: MailService | null = null;
  private ringBuffer: RingBuffer<EmailMessage>;
  private provider: EmailProvider;
  private hasCustomProvider = false;
  private isProcessing = false;
  private queue: EmailMessage[] = [];
  private totalSent = 0;
  private totalFailed = 0;

  private constructor(capacity = 100, customProvider?: EmailProvider) {
    this.ringBuffer = new RingBuffer<EmailMessage>(capacity);
    if (customProvider) {
      this.provider = customProvider;
      this.hasCustomProvider = true;
    } else {
      this.provider = this.createDefaultProvider();
    }
  }

  private createDefaultProvider(): EmailProvider {
    const smtp = new SmtpProvider();
    return smtp.isAvailable() ? smtp : new FallbackProvider();
  }

  public refreshProvider(): void {
    if (this.hasCustomProvider) return;
    const smtp = new SmtpProvider();
    this.provider = smtp.isAvailable() ? smtp : new FallbackProvider();
  }

  public static getInstance(capacity = 100, customProvider?: EmailProvider): MailService {
    if (!MailService.instance) {
      MailService.instance = new MailService(capacity, customProvider);
    }
    return MailService.instance;
  }

  public static resetInstance(): void {
    MailService.instance = null;
  }

  public getBuffer(): EmailMessage[] {
    return this.ringBuffer.toArray();
  }

  public getStats(): MailerStats {
    this.refreshProvider();
    return {
      queued: this.queue.length,
      sent: this.totalSent,
      failed: this.totalFailed,
      totalProcessed: this.totalSent + this.totalFailed,
      activeProvider: this.provider.name,
      bufferSize: this.ringBuffer.length,
      bufferCapacity: this.ringBuffer.capacity,
    };
  }

  public setProvider(provider: EmailProvider): void {
    this.provider = provider;
    this.hasCustomProvider = true;
  }

  public getProvider(): EmailProvider {
    return this.provider;
  }

  public async enqueueEmail(payload: EmailPayload): Promise<EmailMessage> {
    this.refreshProvider();
    const message: EmailMessage = {
      id: generateId(),
      to: Array.isArray(payload.to) ? payload.to.join(", ") : payload.to,
      subject: payload.subject,
      status: "queued",
      createdAt: new Date(),
      provider: this.provider.name,
      format: payload.html ? "html" : "text",
      attachmentCount: payload.attachments?.length ?? 0,
    };

    // Zero-overhead memory retention: RingBuffer stores lightweight metadata only
    this.ringBuffer.push(message);
    this.queue.push(message);

    logger.email("EMAIL_QUEUED", {
      actor: { email: Array.isArray(payload.to) ? payload.to.join(",") : payload.to },
      data: {
        messageId: message.id,
        subject: message.subject,
        provider: message.provider,
        format: message.format,
        attachments: payload.attachments?.map((a) => a.filename),
      },
    });

    // Process immediately in microtask, garbage-collecting payload buffer after execution
    queueMicrotask(() => this.processQueue(payload, message));
    return message;
  }

  private async processQueue(payload: EmailPayload, msg: EmailMessage): Promise<void> {
    try {
      await this.provider.send(payload);
      msg.status = "sent";
      msg.sentAt = new Date();
      this.totalSent++;
      logger.email("EMAIL_SENT_SUCCESS", {
        actor: { email: Array.isArray(payload.to) ? payload.to.join(",") : payload.to },
        data: { messageId: msg.id, subject: msg.subject, provider: this.provider.name },
      });
    } catch (err: any) {
      msg.status = "failed";
      msg.error = err?.message || String(err);
      this.totalFailed++;
      logger.email("EMAIL_SENT_FAILED", {
        level: "ERROR",
        actor: { email: Array.isArray(payload.to) ? payload.to.join(",") : payload.to },
        data: { messageId: msg.id, subject: msg.subject, provider: this.provider.name },
        error: err,
      });
    } finally {
      const idx = this.queue.indexOf(msg);
      if (idx !== -1) this.queue.splice(idx, 1);
    }
  }

  public async sendWelcomeEmail(
    user: { firstName?: string | null; username?: string | null; email: string },
    baseUrl?: string,
    database?: Database
  ) {
    if (database) {
      try {
        const rule = database
          .query<{ is_enabled: number; template_title: string | null }, [string]>(
            "SELECT is_enabled, template_title FROM email_automation_rules WHERE rule_key = ? AND deleted_at IS NULL"
          )
          .get("welcome_email");
        if (rule && !rule.is_enabled) {
          return;
        }
        const tplTitle = rule?.template_title || "welcome_email";
        const { subject, html, text } = renderWelcomeTemplate(user, baseUrl, database, tplTitle);
        return this.enqueueEmail({ to: user.email, subject, html, text });
      } catch {
        // Fallback if automation table not initialized
      }
    }
    const { subject, html, text } = renderWelcomeTemplate(user, baseUrl, database);
    return this.enqueueEmail({ to: user.email, subject, html, text });
  }

  public async sendOtpEmail(email: string, otp: string, database?: Database) {
    const { subject, html, text } = renderOtpEmailTemplate(otp, database);
    return this.enqueueEmail({ to: email, subject, html, text });
  }

  public async sendMeetAttendanceEmail(
    meet: MeetEmailData,
    user: { firstName?: string | null; username?: string | null; email: string },
    baseUrl?: string,
    database?: Database
  ) {
    const { subject, html, text } = renderAttendanceConfirmationTemplate(meet, user, baseUrl, database);
    return this.enqueueEmail({ to: user.email, subject, html, text });
  }

  public async sendFavoriteTagMeetReminders(
    database: Database,
    daysAhead = Number(process.env.MEET_REMINDER_DAYS_BEFORE ?? 1),
    baseUrl?: string,
    templateTitle?: string,
    sendTime = "06:00"
  ): Promise<number> {
    const cleanBase = normalizeBaseUrl(baseUrl);
    const { isTimeToRun } = require("./scheduler");

    // Query upcoming meets that could potentially match any timezone window (e.g. within daysAhead +- 2 days)
    const upcomingMeets = database
      .query<{
        id: string;
        title: string;
        scheduled_date: string;
        scheduled_time: string;
        duration_minutes: number;
        status: string;
        access_status: string;
        presenter_first_name: string | null;
        presenter_last_name: string | null;
      }, []>(
        `SELECT m.id, m.title, m.scheduled_date, m.scheduled_time, m.duration_minutes, m.status, m.access_status,
                u.first_name as presenter_first_name, u.last_name as presenter_last_name
         FROM meets m
         LEFT JOIN users u ON u.id = m.presenter_id
         WHERE m.status = 'upcoming' AND m.deleted_at IS NULL`
      )
      .all();

    let count = 0;
    for (const meet of upcomingMeets) {
      const meetTags = database
        .query<{ id: string; title: string }, [string]>(
          `SELECT t.id, t.title FROM tags t
           JOIN meet_tags mt ON mt.tag_id = t.id
           WHERE mt.meet_id = ? AND t.deleted_at IS NULL`
        )
        .all(meet.id);

      if (!meetTags.length) continue;
      const tagIds = meetTags.map((t) => t.id);
      const tagTitles = meetTags.map((t) => t.title);

      const placeholders = tagIds.map(() => "?").join(",");
      const matchingUsers = database
        .query<{ id: string; email: string; first_name: string | null; username: string | null; timezone: string | null }, any[]>(
          `SELECT DISTINCT u.id, u.email, u.first_name, u.username, u.timezone
           FROM users u
           JOIN user_tags ut ON ut.user_id = u.id
           WHERE ut.tag_id IN (${placeholders}) AND u.deleted_at IS NULL`
        )
        .all(...tagIds);

      const meetData: MeetEmailData = {
        id: meet.id,
        title: meet.title,
        scheduledDate: meet.scheduled_date,
        scheduledTime: meet.scheduled_time,
        durationMinutes: meet.duration_minutes,
        presenterName: [meet.presenter_first_name, meet.presenter_last_name].filter(Boolean).join(" ") || undefined,
        status: meet.status,
        accessStatus: meet.access_status,
      };

      for (const user of matchingUsers) {
        const userTz = user.timezone || "Asia/Tehran";

        // Check if user's local clock reached scheduled send_time (e.g. 06:00)
        if (!isTimeToRun(sendTime, userTz)) {
          continue;
        }

        // Calculate target meet date according to user's timezone + daysAhead
        const now = new Date();
        const userDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: userTz }).format(now); // YYYY-MM-DD
        const userTargetDate = new Date(`${userDateStr}T00:00:00Z`);
        userTargetDate.setUTCDate(userTargetDate.getUTCDate() + daysAhead);
        const expectedMeetDateStr = userTargetDate.toISOString().slice(0, 10);

        if (meet.scheduled_date !== expectedMeetDateStr) {
          continue;
        }

        // Check if reminder was already sent for this meet and user
        const alreadySent = database
          .query<{ id: string }, [string, string, string]>(
            "SELECT id FROM email_reminder_logs WHERE rule_key = ? AND meet_id = ? AND user_id = ?"
          )
          .get("tag_reminder", meet.id, user.id);

        if (alreadySent) continue;

        const { subject, html, text } = renderTagReminderTemplate(
          meetData,
          user,
          tagTitles,
          cleanBase,
          database,
          templateTitle || "tag_reminder"
        );
        await this.enqueueEmail({ to: user.email, subject, html, text });
        database.run(
          "INSERT OR IGNORE INTO email_reminder_logs (id, rule_key, meet_id, user_id) VALUES (?, ?, ?, ?)",
          [generateId(), "tag_reminder", meet.id, user.id]
        );
        count++;
      }
    }
    return count;
  }

  public async sendMeetAttendeesReminder(
    database: Database,
    meetId: string,
    baseUrl?: string,
    templateTitle?: string,
    daysAhead = 0,
    sendTime = "06:00"
  ): Promise<number> {
    const cleanBase = normalizeBaseUrl(baseUrl);
    const { isTimeToRun } = require("./scheduler");

    const meet = database
      .query<{
        id: string;
        title: string;
        scheduled_date: string;
        scheduled_time: string;
        duration_minutes: number;
        status: string;
        access_status: string;
        presenter_first_name: string | null;
        presenter_last_name: string | null;
      }, [string]>(
        `SELECT m.id, m.title, m.scheduled_date, m.scheduled_time, m.duration_minutes, m.status, m.access_status,
                u.first_name as presenter_first_name, u.last_name as presenter_last_name
         FROM meets m
         LEFT JOIN users u ON u.id = m.presenter_id
         WHERE m.id = ? AND m.deleted_at IS NULL`
      )
      .get(meetId);

    if (!meet) return 0;

    const attendees = database
      .query<{ id: string; email: string; first_name: string | null; username: string | null; timezone: string | null }, [string]>(
        `SELECT DISTINCT u.id, u.email, u.first_name, u.username, u.timezone
         FROM users u
         JOIN meet_attendees ma ON ma.user_id = u.id
         WHERE ma.meet_id = ? AND u.deleted_at IS NULL`
      )
      .all(meetId);

    const meetData: MeetEmailData = {
      id: meet.id,
      title: meet.title,
      scheduledDate: meet.scheduled_date,
      scheduledTime: meet.scheduled_time,
      durationMinutes: meet.duration_minutes,
      presenterName: [meet.presenter_first_name, meet.presenter_last_name].filter(Boolean).join(" ") || undefined,
      status: meet.status,
      accessStatus: meet.access_status,
    };

    let count = 0;
    for (const attendee of attendees) {
      const userTz = attendee.timezone || "Asia/Tehran";

      // Check if user's local clock reached scheduled send_time
      if (!isTimeToRun(sendTime, userTz)) {
        continue;
      }

      // Calculate target meet date for user's timezone + daysAhead
      const now = new Date();
      const userDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: userTz }).format(now); // YYYY-MM-DD
      const userTargetDate = new Date(`${userDateStr}T00:00:00Z`);
      userTargetDate.setUTCDate(userTargetDate.getUTCDate() + daysAhead);
      const expectedMeetDateStr = userTargetDate.toISOString().slice(0, 10);

      if (meet.scheduled_date !== expectedMeetDateStr) {
        continue;
      }

      // Check if reminder was already sent for this meet and attendee
      const alreadySent = database
        .query<{ id: string }, [string, string, string]>(
          "SELECT id FROM email_reminder_logs WHERE rule_key = ? AND meet_id = ? AND user_id = ?"
        )
        .get("rsvp_reminder", meet.id, attendee.id);

      if (alreadySent) continue;

      const { subject, html, text } = renderAttendeesReminderTemplate(
        meetData,
        attendee,
        cleanBase,
        database,
        templateTitle || "attendees_reminder"
      );
      await this.enqueueEmail({ to: attendee.email, subject, html, text });
      database.run(
        "INSERT OR IGNORE INTO email_reminder_logs (id, rule_key, meet_id, user_id) VALUES (?, ?, ?, ?)",
        [generateId(), "rsvp_reminder", meet.id, attendee.id]
      );
      count++;
    }
    return count;
  }

  public async sendBatchEmails(
    database: Database,
    filter: BatchFilterOptions,
    subject: string,
    body: string,
    format: "html" | "markdown" | "text" = "html",
    attachments?: import("./types").EmailAttachment[]
  ): Promise<number> {
    let users: { email: string; first_name: string | null; last_name: string | null; username: string | null }[] = [];

    if (filter.mode === "selected" && filter.userIds?.length) {
      const ph = filter.userIds.map(() => "?").join(",");
      users = database
        .query<
          { email: string; first_name: string | null; last_name: string | null; username: string | null },
          any[]
        >(`SELECT email, first_name, last_name, username FROM users WHERE id IN (${ph}) AND deleted_at IS NULL`)
        .all(...filter.userIds);
    } else if (filter.mode === "domain" && filter.domain) {
      const dom = filter.domain.startsWith("@") ? `%${filter.domain}` : `%@${filter.domain}`;
      users = database
        .query<
          { email: string; first_name: string | null; last_name: string | null; username: string | null },
          [string]
        >(`SELECT email, first_name, last_name, username FROM users WHERE email LIKE ? AND deleted_at IS NULL`)
        .all(dom);
    } else if (filter.mode === "tags" && filter.tagIds?.length) {
      const ph = filter.tagIds.map(() => "?").join(",");
      users = database
        .query<
          { email: string; first_name: string | null; last_name: string | null; username: string | null },
          any[]
        >(
          `SELECT DISTINCT u.email, u.first_name, u.last_name, u.username
           FROM users u
           JOIN user_tags ut ON ut.user_id = u.id
           WHERE ut.tag_id IN (${ph}) AND u.deleted_at IS NULL`
        )
        .all(...filter.tagIds);
    } else {
      // all active users
      users = database
        .query<
          { email: string; first_name: string | null; last_name: string | null; username: string | null },
          []
        >(`SELECT email, first_name, last_name, username FROM users WHERE deleted_at IS NULL`)
        .all();
    }

    // Process batch in chunks to avoid large memory spikes
    const CHUNK_SIZE = 50;
    const cleanBase = normalizeBaseUrl();
    for (let i = 0; i < users.length; i += CHUNK_SIZE) {
      const chunk = users.slice(i, i + CHUNK_SIZE);
      for (const u of chunk) {
        const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || u.email;
        const vars = {
          name,
          email: u.email,
          first_name: u.first_name || "",
          last_name: u.last_name || "",
          username: u.username || "",
          dashboard_url: `${cleanBase}/dashboard/user`,
          unsubscribe_url: `${cleanBase}/dashboard/account`,
          date: new Date().toLocaleDateString(),
          date_shamsi: getShamsiToday(),
        };

        const interpolatedSubject = interpolateVariables(subject, vars);
        const interpolatedBody = interpolateVariables(body, vars);

        let finalHtml: string | undefined;
        let finalText: string | undefined;

        if (format === "markdown") {
          finalHtml = wrapEmailContainer(renderMarkdown(interpolatedBody));
          finalText = interpolatedBody;
        } else if (format === "text") {
          finalHtml = wrapEmailContainer(`<pre style="white-space: pre-wrap; font-family: inherit;">${interpolatedBody}</pre>`);
          finalText = interpolatedBody;
        } else {
          finalHtml = wrapEmailContainer(interpolatedBody);
          finalText = interpolatedBody.replace(/<[^>]*>?/gm, "").trim();
        }

        const payload: EmailPayload = {
          to: u.email,
          subject: interpolatedSubject,
          html: finalHtml,
          text: finalText,
          ...(attachments && attachments.length ? { attachments } : {}),
        };
        await this.enqueueEmail(payload);
      }
    }

    return users.length;
  }

  /**
   * Process all pending scheduled emails whose target execution time has arrived.
   */
  public async processScheduledEmails(database: Database): Promise<number> {
    const nowIso = new Date().toISOString();
    const pendingJobs = database
      .query<
        {
          id: string;
          title: string;
          subject: string;
          format: "html" | "markdown" | "text";
          body: string;
          target_mode: "all" | "tags" | "domain" | "selected";
          target_payload: string;
          scheduled_for: string;
        },
        [string]
      >(
        `SELECT id, title, subject, format, body, target_mode, target_payload, scheduled_for
         FROM scheduled_emails
         WHERE status = 'pending' AND scheduled_for <= ? AND deleted_at IS NULL
         ORDER BY scheduled_for ASC`
      )
      .all(nowIso);

    let processedCount = 0;
    for (const job of pendingJobs) {
      // Mark processing atomically
      database.run(
        "UPDATE scheduled_emails SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [job.id]
      );

      try {
        let filter: BatchFilterOptions = { mode: job.target_mode };
        if (job.target_payload) {
          try {
            const parsed = JSON.parse(job.target_payload);
            if (job.target_mode === "tags" && Array.isArray(parsed.tagIds)) {
              filter.tagIds = parsed.tagIds;
            } else if (job.target_mode === "selected" && Array.isArray(parsed.userIds)) {
              filter.userIds = parsed.userIds;
            } else if (job.target_mode === "domain" && parsed.domain) {
              filter.domain = parsed.domain;
            }
          } catch {
            // Raw string domain fallback
            if (job.target_mode === "domain") filter.domain = job.target_payload;
          }
        }

        const count = await this.sendBatchEmails(
          database,
          filter,
          job.subject,
          job.body,
          job.format
        );

        database.run(
          "UPDATE scheduled_emails SET status = 'sent', sent_count = ?, error = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [count, job.id]
        );
        processedCount++;
      } catch (err: any) {
        database.run(
          "UPDATE scheduled_emails SET status = 'failed', error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [err?.message || String(err), job.id]
        );
      }
    }

    return processedCount;
  }
}

export const mailService = MailService.getInstance();
