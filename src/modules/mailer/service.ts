import type { Database } from "bun:sqlite";
import { RingBuffer } from "./ring-buffer";
import { FallbackProvider, SmtpProvider } from "./providers";
import {
  renderAttendanceConfirmationTemplate,
  renderOtpEmailTemplate,
  renderTagReminderTemplate,
  renderWelcomeTemplate,
  type MeetEmailData,
} from "./templates";
import type { BatchFilterOptions, EmailMessage, EmailPayload, EmailProvider, MailerStats } from "./types";
import { generateId } from "../../lib/id";
import { logger } from "../../lib/logger";

export class MailService {
  private static instance: MailService | null = null;
  private ringBuffer: RingBuffer<EmailMessage>;
  private provider: EmailProvider;
  private isProcessing = false;
  private queue: EmailMessage[] = [];
  private totalSent = 0;
  private totalFailed = 0;

  private constructor(capacity = 100, customProvider?: EmailProvider) {
    this.ringBuffer = new RingBuffer<EmailMessage>(capacity);
    if (customProvider) {
      this.provider = customProvider;
    } else {
      const smtp = new SmtpProvider();
      this.provider = smtp.isAvailable() ? smtp : new FallbackProvider();
    }
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
  }

  public getProvider(): EmailProvider {
    return this.provider;
  }

  public async enqueueEmail(payload: EmailPayload): Promise<EmailMessage> {
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
    if (this.isProcessing) return;
    this.isProcessing = true;

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
      this.isProcessing = false;
    }
  }

  public async sendWelcomeEmail(user: { firstName?: string | null; username?: string | null; email: string }, baseUrl?: string) {
    const { subject, html, text } = renderWelcomeTemplate(user, baseUrl);
    return this.enqueueEmail({ to: user.email, subject, html, text });
  }

  public async sendOtpEmail(email: string, otp: string) {
    const { subject, html, text } = renderOtpEmailTemplate(otp);
    return this.enqueueEmail({ to: email, subject, html, text });
  }

  public async sendMeetAttendanceEmail(
    meet: MeetEmailData,
    user: { firstName?: string | null; username?: string | null; email: string },
    baseUrl?: string
  ) {
    const { subject, html, text } = renderAttendanceConfirmationTemplate(meet, user, baseUrl);
    return this.enqueueEmail({ to: user.email, subject, html, text });
  }

  public async sendFavoriteTagMeetReminders(
    database: Database,
    daysAhead = Number(process.env.MEET_REMINDER_DAYS_BEFORE ?? 1),
    baseUrl = process.env.BASE_URL ?? "http://localhost:3000"
  ): Promise<number> {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    const targetDateStr = target.toISOString().slice(0, 10);

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
      }, [string]>(
        `SELECT m.id, m.title, m.scheduled_date, m.scheduled_time, m.duration_minutes, m.status, m.access_status,
                u.first_name as presenter_first_name, u.last_name as presenter_last_name
         FROM meets m
         LEFT JOIN users u ON u.id = m.presenter_id
         WHERE m.scheduled_date = ? AND m.status = 'upcoming' AND m.deleted_at IS NULL`
      )
      .all(targetDateStr);

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
        .query<{ email: string; first_name: string | null; username: string | null }, any[]>(
          `SELECT DISTINCT u.email, u.first_name, u.username
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
        const { subject, html, text } = renderTagReminderTemplate(meetData, user, tagTitles, baseUrl);
        await this.enqueueEmail({ to: user.email, subject, html, text });
        count++;
      }
    }
    return count;
  }

  public async sendBatchEmails(
    database: Database,
    filter: BatchFilterOptions,
    subject: string,
    body: string,
    format: "html" | "text" = "html",
    attachments?: import("./types").EmailAttachment[]
  ): Promise<number> {
    let emails: string[] = [];

    if (filter.mode === "selected" && filter.userIds?.length) {
      const ph = filter.userIds.map(() => "?").join(",");
      emails = database
        .query<{ email: string }, any[]>(`SELECT email FROM users WHERE id IN (${ph}) AND deleted_at IS NULL`)
        .all(...filter.userIds)
        .map((r) => r.email);
    } else if (filter.mode === "domain" && filter.domain) {
      const dom = filter.domain.startsWith("@") ? `%${filter.domain}` : `%@${filter.domain}`;
      emails = database
        .query<{ email: string }, [string]>(`SELECT email FROM users WHERE email LIKE ? AND deleted_at IS NULL`)
        .all(dom)
        .map((r) => r.email);
    } else if (filter.mode === "tags" && filter.tagIds?.length) {
      const ph = filter.tagIds.map(() => "?").join(",");
      emails = database
        .query<{ email: string }, any[]>(
          `SELECT DISTINCT u.email FROM users u JOIN user_tags ut ON ut.user_id = u.id WHERE ut.tag_id IN (${ph}) AND u.deleted_at IS NULL`
        )
        .all(...filter.tagIds)
        .map((r) => r.email);
    } else {
      // all active users
      emails = database
        .query<{ email: string }, []>(`SELECT email FROM users WHERE deleted_at IS NULL`)
        .all()
        .map((r) => r.email);
    }

    for (const to of emails) {
      const payload: EmailPayload = {
        to,
        subject,
        ...(format === "html" ? { html: body, text: body.replace(/<[^>]*>?/gm, "") } : { text: body }),
        ...(attachments && attachments.length ? { attachments } : {}),
      };
      await this.enqueueEmail(payload);
    }

    return emails.length;
  }
}

export const mailService = MailService.getInstance();
