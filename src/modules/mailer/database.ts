import type { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { generateId } from "../../lib/id";

export interface EmailTemplateRow {
  id: string;
  title: string;
  subject: string;
  format: "html" | "markdown" | "text";
  value: string;
  description: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ScheduledEmailRow {
  id: string;
  template_id: string | null;
  title: string;
  subject: string;
  format: "html" | "markdown" | "text";
  body: string;
  target_mode: "all" | "tags" | "domain" | "selected";
  target_payload: string;
  scheduled_for: string;
  status: "pending" | "processing" | "sent" | "failed" | "cancelled";
  sent_count: number;
  error: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export const PREBUILT_EMAIL_TEMPLATES = [
  {
    title: "welcome_email",
    subject: "Welcome to CobraDecision | خوش آمدید",
    format: "html" as const,
    description: "Dynamic bilingual onboarding welcome email sent to new registered users",
    value: `<div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
  <div style="background: #0f172a; color: #ffffff; padding: 20px; text-align: center; font-size: 20px; font-weight: bold;">
    تصمیم کبرا | CobraDecision
  </div>
  <div style="padding: 24px; color: #1e293b;">
    <div dir="rtl" style="text-align: right; margin-bottom: 20px;">
      <h2 style="color: #1e293b; margin-top: 0;">خوش آمدید {{name}}!</h2>
      <p>حساب کاربری شما در تصمیم کبرا با موفقیت فعال شد. اکنون می‌توانید در رویدادها و گفتگوهای فنی جامعه شرکت کنید.</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{{dashboard_url}}" style="background: #2563eb; color: #ffffff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">ورود به داشبورد</a>
      </p>
    </div>
    <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 24px 0;" />
    <div dir="ltr" style="text-align: left;">
      <h2 style="color: #1e293b; margin-top: 0;">Welcome, {{name}}!</h2>
      <p>Your CobraDecision account is ready. Discover and participate in upcoming community tech sessions.</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{{dashboard_url}}" style="background: #2563eb; color: #ffffff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">Go to Dashboard</a>
      </p>
    </div>
  </div>
</div>`,
  },
  {
    title: "otp_verification",
    subject: "کد تایید ثبت‌نام: {{otp}} | Verification Code: {{otp}}",
    format: "html" as const,
    description: "One-time password code for registration verification",
    value: `<div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
  <div style="background: #2563eb; color: #ffffff; padding: 20px; text-align: center; font-size: 20px; font-weight: bold;">
    تصمیم کبرا | تایید حساب کاربری
  </div>
  <div style="padding: 24px; color: #1e293b;">
    <div dir="rtl" style="text-align: right; margin-bottom: 20px;">
      <h2 style="margin-top: 0;">کد تایید ثبت‌نام</h2>
      <p>کد یکبار مصرف شما برای ثبت‌نام در تصمیم کبرا:</p>
      <div style="font-size: 26px; font-weight: bold; text-align: center; letter-spacing: 6px; color: #2563eb; background: #f1f5f9; padding: 14px; border-radius: 8px; margin: 16px 0; border: 1px solid #e2e8f0;">
        {{otp}}
      </div>
      <p style="font-size: 12px; color: #64748b;">این کد تا ۱۰ دقیقه معتبر است. اگر شما درخواست نداده‌اید این پیام را نادیده بگیرید.</p>
    </div>
    <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 24px 0;" />
    <div dir="ltr" style="text-align: left;">
      <h2 style="margin-top: 0;">Registration Verification Code</h2>
      <p>Your one-time code for CobraDecision registration:</p>
      <div style="font-size: 26px; font-weight: bold; text-align: center; letter-spacing: 6px; color: #2563eb; background: #f1f5f9; padding: 14px; border-radius: 8px; margin: 16px 0; border: 1px solid #e2e8f0;">
        {{otp}}
      </div>
      <p style="font-size: 12px; color: #64748b;">Valid for 10 minutes. If you did not request this, please ignore.</p>
    </div>
  </div>
</div>`,
  },
  {
    title: "attendance_confirmation",
    subject: "ثبت‌نام در جلسه: {{meet_title}} | RSVP Confirmed: {{meet_title}}",
    format: "html" as const,
    description: "Confirmation email sent when user registers for a tech meeting",
    value: `<div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
  <div style="background: #0f172a; color: #ffffff; padding: 20px; text-align: center; font-size: 20px; font-weight: bold;">
    تصمیم کبرا | تایید حضور در رویداد
  </div>
  <div style="padding: 24px; color: #1e293b;">
    <div dir="rtl" style="text-align: right; margin-bottom: 20px;">
      <h2 style="margin-top: 0;">تبریک {{name}} عزیز! حضور شما ثبت شد</h2>
      <p>مشخصات جلسه:</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 14px; line-height: 1.8;">
        <div><strong>عنوان:</strong> {{meet_title}}</div>
        <div><strong>تاریخ:</strong> {{meet_date_shamsi}} ({{meet_date}}) | <strong>زمان:</strong> {{meet_time}} ({{meet_duration}} دقیقه)</div>
        <div><strong>ارائه‌دهنده:</strong> {{presenter_name}}</div>
      </div>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{{meet_link}}" style="background: #2563eb; color: #ffffff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">مشاهده صفحه جلسه و ورود</a>
      </p>
    </div>
    <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 24px 0;" />
    <div dir="ltr" style="text-align: left;">
      <h2 style="margin-top: 0;">Congratulations {{name}}! You're In!</h2>
      <p>Meeting details:</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 14px; line-height: 1.8;">
        <div><strong>Title:</strong> {{meet_title}}</div>
        <div><strong>Date:</strong> {{meet_date}} | <strong>Time:</strong> {{meet_time}} ({{meet_duration}} mins)</div>
        <div><strong>Presenter:</strong> {{presenter_name}}</div>
      </div>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{{meet_link}}" style="background: #2563eb; color: #ffffff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">View Meeting Page</a>
      </p>
    </div>
  </div>
</div>`,
  },
  {
    title: "tag_reminder",
    subject: "یادآوری: جلسه مرتبط با علایق شما ({{meet_title}})",
    format: "html" as const,
    description: "Scheduled reminder for meetings matching user followed tags",
    value: `<div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
  <div style="background: #2563eb; color: #ffffff; padding: 20px; text-align: center; font-size: 20px; font-weight: bold;">
    تصمیم کبرا | یادآوری رویداد مورد علاقه
  </div>
  <div style="padding: 24px; color: #1e293b;">
    <div dir="rtl" style="text-align: right; margin-bottom: 20px;">
      <h2 style="margin-top: 0;">سلام {{name}} عزیز</h2>
      <p>جلسه جدیدی مرتبط با تگ‌های مورد علاقه شما (<strong>{{tags}}</strong>) به زودی برگزار می‌شود:</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <div style="font-weight: bold; color: #2563eb; font-size: 16px; margin-bottom: 6px;">{{meet_title}}</div>
        <div>{{meet_date}} | {{meet_time}}</div>
      </div>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{{meet_link}}" style="background: #2563eb; color: #ffffff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">مشاهده جزئیات و ثبت‌نام</a>
      </p>
    </div>
    <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 24px 0;" />
    <div dir="ltr" style="text-align: left;">
      <h2 style="margin-top: 0;">Hi {{name}}</h2>
      <p>An upcoming meeting matches your preferred tags (<strong>{{tags}}</strong>):</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <div style="font-weight: bold; color: #2563eb; font-size: 16px; margin-bottom: 6px;">{{meet_title}}</div>
        <div>{{meet_date}} | {{meet_time}}</div>
      </div>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{{meet_link}}" style="background: #2563eb; color: #ffffff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">View & RSVP</a>
      </p>
    </div>
  </div>
</div>`,
  },
  {
    title: "attendees_reminder",
    subject: "یادآوری رویداد: {{meet_title}} | Event Reminder: {{meet_title}}",
    format: "html" as const,
    description: "Scheduled reminder for users who registered/attended a specific meeting",
    value: `<div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
  <div style="background: #2563eb; color: #ffffff; padding: 20px; text-align: center; font-size: 20px; font-weight: bold;">
    تصمیم کبرا | رویداد پیش‌رو
  </div>
  <div style="padding: 24px; color: #1e293b;">
    <div dir="rtl" style="text-align: right; margin-bottom: 20px;">
      <h2 style="margin-top: 0;">سلام {{name}} عزیز</h2>
      <p>جلسه‌ای که در آن ثبت‌نام کرده‌اید به زودی برگزار می‌شود:</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 14px; line-height: 1.8;">
        <div><strong>عنوان:</strong> {{meet_title}}</div>
        <div><strong>تاریخ:</strong> {{meet_date_shamsi}} ({{meet_date}}) | <strong>زمان:</strong> {{meet_time}}</div>
        <div><strong>ارائه‌دهنده:</strong> {{presenter_name}}</div>
      </div>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{{meet_link}}" style="background: #2563eb; color: #ffffff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">ورود به اتاق جلسه</a>
      </p>
    </div>
    <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 24px 0;" />
    <div dir="ltr" style="text-align: left;">
      <h2 style="margin-top: 0;">Hello {{name}}</h2>
      <p>A meeting you registered for is happening soon:</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 14px; line-height: 1.8;">
        <div><strong>Title:</strong> {{meet_title}}</div>
        <div><strong>Date:</strong> {{meet_date}} | <strong>Time:</strong> {{meet_time}}</div>
        <div><strong>Presenter:</strong> {{presenter_name}}</div>
      </div>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{{meet_link}}" style="background: #2563eb; color: #ffffff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">Join Meeting</a>
      </p>
    </div>
  </div>
</div>`,
  },
  {
    title: "general_announcement",
    subject: "اطلاعیه جامعه مهندسی: {{subject_topic}} | Community Update",
    format: "markdown" as const,
    description: "Bilingual markdown starter announcement template for community newsletters",
    value: `### سلام {{name}} عزیز

خوشحالیم که آخرین اخبار و رویدادهای پیش‌روی **تصمیم کبرا** را با شما به اشتراک می‌گذاریم.

- **جلسات و کارگاه‌های تخصصی جدید**: گفتگوهای زنده معماری و نرم‌افزار.
- **ارتباط با جامعه متخصصان**: تبادل نظر با مهندسان و ارائه‌دهندگان برتر.
- **تاریخ انتشار**: {{date_shamsi}}

برای مشاهده برنامه کامل رویدادها به [داشبورد کاربری]({{dashboard_url}}) مراجعه نمایید.

---

### Hello {{name}}

We are excited to share recent updates and upcoming engineering sessions at **CobraDecision**.

- **Interactive Tech Sessions**: Explore upcoming live workshops.
- **Community Highlights**: Connect with top presenters and engineers.
- **Published on**: {{date}}

Visit your [Member Dashboard]({{dashboard_url}}) to view the schedule.

Best regards,
*The CobraDecision Team*`,
  },
];

export function initializeMailerDatabase(database: Database) {
  const schemaPath = join(__dirname, "schema.sql");
  const schemaSql = readFileSync(schemaPath, "utf8");
  database.exec(schemaSql);

  // Seed default prebuilt templates if not present
  for (const t of PREBUILT_EMAIL_TEMPLATES) {
    const existing = database
      .query<{ id: string }, [string]>("SELECT id FROM emails_schema WHERE title = ?")
      .get(t.title);
    if (!existing) {
      database.run(
        "INSERT INTO emails_schema (id, title, subject, format, value, description) VALUES (?, ?, ?, ?, ?, ?)",
        [generateId(), t.title, t.subject, t.format, t.value, t.description]
      );
    }
  }
}
