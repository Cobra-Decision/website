export interface MeetEmailData {
  id: string;
  title: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  presenterName?: string;
  status: string;
  accessStatus: string;
}

/**
 * Unified lightweight HTML wrapper for emails.
 */
function wrapBilingualEmail({
  title,
  faContent,
  enContent,
  headerBg = "#0f172a",
}: {
  title: string;
  faContent: string;
  enContent: string;
  headerBg?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;background-color:#f8fafc;color:#1e293b;margin:0;padding:16px;}
    .box{max-width:580px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;}
    .hdr{background:${headerBg};color:#fff;padding:20px;text-align:center;font-size:20px;font-weight:bold;}
    .body{padding:20px;line-height:1.6;}
    .card{background:#f1f5f9;border-radius:8px;padding:12px;margin:12px 0;font-size:14px;}
    .btn{display:inline-block;background:#2563eb;color:#fff !important;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;margin:10px 0;}
    .hr{border-top:1px dashed #cbd5e1;margin:24px 0;}
    .en{direction:ltr;text-align:left;}
    .fa{direction:rtl;text-align:right;}
  </style>
</head>
<body>
  <div class="box">
    <div class="hdr">${title}</div>
    <div class="body">
      <div class="fa">${faContent}</div>
      <div class="hr"></div>
      <div class="en">${enContent}</div>
    </div>
  </div>
</body>
</html>`;
}

export function renderWelcomeTemplate(
  user: { firstName?: string | null; username?: string | null; email: string },
  baseUrl = "http://localhost:3000"
) {
  const name = user.firstName || user.username || user.email;
  const subject = "Welcome to CobraDecision | خوش آمدید";

  const faContent = `
    <h2>خوش آمدید ${name}! 🎉</h2>
    <p>حساب کاربری شما در کبرا دسیژن با موفقیت ایجاد شد. اکنون می‌توانید در رویدادها و گفتگوهای فنی جامعه مهندسی شرکت کنید.</p>
    <a href="${baseUrl}/dashboard/user" class="btn">ورود به داشبورد</a>
  `;

  const enContent = `
    <h2>Welcome, ${name}! 🎉</h2>
    <p>Your CobraDecision account is ready. Discover and participate in community tech sessions.</p>
    <a href="${baseUrl}/dashboard/user" class="btn">Go to Dashboard</a>
  `;

  const html = wrapBilingualEmail({ title: "CobraDecision", faContent, enContent, headerBg: "#4f46e5" });
  const text = `خوش آمدید ${name}!\nداشبورد: ${baseUrl}/dashboard/user\n\nWelcome ${name}!\nDashboard: ${baseUrl}/dashboard/user`;

  return { subject, html, text };
}

export function renderOtpEmailTemplate(otp: string) {
  const subject = `کد تایید ثبت‌نام: ${otp} | Verification Code: ${otp}`;

  const faContent = `
    <h2>کد تایید ثبت‌نام</h2>
    <p>کد یکبار مصرف شما برای ثبت‌نام در کبرا دسیژن:</p>
    <div class="card" style="font-size:24px;font-weight:bold;text-align:center;letter-spacing:4px;color:#2563eb;">${otp}</div>
    <p style="font-size:12px;color:#64748b;">این کد تا ۱۰ دقیقه معتبر است. اگر شما درخواست نداده‌اید این پیام را نادیده بگیرید.</p>
  `;

  const enContent = `
    <h2>Registration Verification Code</h2>
    <p>Your one-time code for CobraDecision registration:</p>
    <div class="card" style="font-size:24px;font-weight:bold;text-align:center;letter-spacing:4px;color:#2563eb;">${otp}</div>
    <p style="font-size:12px;color:#64748b;">Valid for 10 minutes. If you did not request this, please ignore.</p>
  `;

  const html = wrapBilingualEmail({ title: "CobraDecision Verification", faContent, enContent, headerBg: "#2563eb" });
  const text = `کد تایید شما: ${otp} (معتبر برای ۱۰ دقیقه)\nYour verification code: ${otp} (valid for 10 minutes)`;

  return { subject, html, text };
}

export function renderAttendanceConfirmationTemplate(
  meet: MeetEmailData,
  user: { firstName?: string | null; username?: string | null; email: string },
  baseUrl = "http://localhost:3000"
) {
  const name = user.firstName || user.username || user.email;
  const subject = `ثبت‌نام در جلسه: ${meet.title} | RSVP Confirmed: ${meet.title}`;
  const meetLink = `${baseUrl}/meets/${meet.id}?ref=gmail`;

  const faContent = `
    <h2>تبریک ${name} عزیز! حضور شما ثبت شد ✨</h2>
    <p>مشخصات جلسه:</p>
    <div class="card">
      <div><strong>📌 عنوان:</strong> ${meet.title}</div>
      <div><strong>📅 تاریخ:</strong> ${meet.scheduledDate} | <strong>⏰ زمان:</strong> ${meet.scheduledTime} (${meet.durationMinutes} دقیقه)</div>
      ${meet.presenterName ? `<div><strong>🎤 ارائه‌دهنده:</strong> ${meet.presenterName}</div>` : ""}
      <div><strong>🔒 نوع دسترسی:</strong> ${meet.accessStatus === "public" ? "عمومی" : "خصوصی"}</div>
    </div>
    <p style="text-align:center;"><a href="${meetLink}" class="btn">مشاهده صفحه جلسه و ورود</a></p>
  `;

  const enContent = `
    <h2>Congratulations ${name}! You're In! ✨</h2>
    <p>Meeting details:</p>
    <div class="card">
      <div><strong>📌 Title:</strong> ${meet.title}</div>
      <div><strong>📅 Date:</strong> ${meet.scheduledDate} | <strong>⏰ Time:</strong> ${meet.scheduledTime} (${meet.durationMinutes} mins)</div>
      ${meet.presenterName ? `<div><strong>🎤 Presenter:</strong> ${meet.presenterName}</div>` : ""}
      <div><strong>🔒 Access:</strong> ${meet.accessStatus}</div>
    </div>
    <p style="text-align:center;"><a href="${meetLink}" class="btn">View Meeting Page</a></p>
  `;

  const html = wrapBilingualEmail({ title: "CobraDecision", faContent, enContent, headerBg: "#0f172a" });
  const text = `تبریک ${name}! ثبت‌نام شما در "${meet.title}" تایید شد.\nتاریخ: ${meet.scheduledDate} ${meet.scheduledTime}\nلینک: ${meetLink}\n\nCongratulations ${name}! RSVP confirmed for "${meet.title}".\nLink: ${meetLink}`;

  return { subject, html, text };
}

export function renderTagReminderTemplate(
  meet: MeetEmailData,
  user: { firstName?: string | null; username?: string | null; email: string },
  matchedTags: string[],
  baseUrl = "http://localhost:3000"
) {
  const name = user.firstName || user.username || user.email;
  const subject = `یادآوری: جلسه مرتبط با علایق شما (${meet.title})`;
  const meetLink = `${baseUrl}/meets/${meet.id}?ref=gmail`;

  const faContent = `
    <h2>سلام ${name} عزیز 🔔</h2>
    <p>جلسه جدیدی مرتبط با تگ‌های مورد علاقه شما (<strong>${matchedTags.join("، ")}</strong>) فردا برگزار می‌شود:</p>
    <div class="card">
      <div style="font-weight:bold;color:#4338ca;">${meet.title}</div>
      <div>📅 ${meet.scheduledDate} | ⏰ ${meet.scheduledTime}</div>
    </div>
    <p style="text-align:center;"><a href="${meetLink}" class="btn" style="background:#4338ca;">مشاهده جزئیات و ثبت‌نام</a></p>
  `;

  const enContent = `
    <h2>Hi ${name} 🔔</h2>
    <p>An upcoming meeting matches your preferred tags (<strong>${matchedTags.join(", ")}</strong>):</p>
    <div class="card">
      <div style="font-weight:bold;color:#4338ca;">${meet.title}</div>
      <div>📅 ${meet.scheduledDate} | ⏰ ${meet.scheduledTime}</div>
    </div>
    <p style="text-align:center;"><a href="${meetLink}" class="btn" style="background:#4338ca;">View & RSVP</a></p>
  `;

  const html = wrapBilingualEmail({ title: "CobraDecision Reminder", faContent, enContent, headerBg: "#4338ca" });
  const text = `سلام ${name}! جلسه مرتبط با علایق شما فردا برگزار می‌شود:\n${meet.title} (${meet.scheduledDate} ${meet.scheduledTime})\nلینک: ${meetLink}`;

  return { subject, html, text };
}
