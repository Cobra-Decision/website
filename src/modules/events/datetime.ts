import type { Locale } from "../../lib/i18n/translations";
import { formatLocalizedNumber, toEnglishDigits, toPersianDigits } from "../../lib/i18n/context";

function getSafeTimeZone(timeZone?: string): string {
  if (!timeZone) return "Asia/Tehran";
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return timeZone;
  } catch {
    return "Asia/Tehran";
  }
}

/**
 * Calculates the exact UTC ISO string for a local date (YYYY-MM-DD) and time (HH:MM)
 * in any specified IANA timezone using standard Intl & Date.
 */
export function toUtcIso(date: string, time: string, timeZone = "Asia/Tehran"): string {
  const cleanDate = toEnglishDigits(date || "").trim();
  const cleanTime = toEnglishDigits(time || "").trim();
  const [year, month, day] = cleanDate.split("-").map(Number);
  const [hour, minute] = (cleanTime || "00:00").split(":").map(Number);

  if (!year || !month || !day || isNaN(hour) || isNaN(minute)) {
    return new Date().toISOString();
  }

  const tz = getSafeTimeZone(timeZone);

  // Approximate UTC timestamp assuming local time was UTC
  const approxUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  // Format parts in target timezone to find the exact offset
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const getTzOffsetMs = (dateMs: number) => {
    const parts = dtf.formatToParts(new Date(dateMs));
    let y = 0, m = 0, d = 0, h = 0, min = 0, s = 0;
    for (const p of parts) {
      if (p.type === "year") y = Number(p.value);
      else if (p.type === "month") m = Number(p.value);
      else if (p.type === "day") d = Number(p.value);
      else if (p.type === "hour") h = Number(p.value);
      else if (p.type === "minute") min = Number(p.value);
      else if (p.type === "second") s = Number(p.value);
    }
    // Handle 24h edge cases in some Intl implementations (e.g. 24 -> 00)
    if (h === 24) h = 0;
    const tzAsUtc = Date.UTC(y, m - 1, d, h, min, s, 0);
    return tzAsUtc - dateMs;
  };

  // Iteratively resolve exact instant (handles DST transitions cleanly)
  let offsetMs = getTzOffsetMs(approxUtc);
  let exactUtc = approxUtc - offsetMs;
  const recheckedOffsetMs = getTzOffsetMs(exactUtc);
  if (recheckedOffsetMs !== offsetMs) {
    exactUtc = approxUtc - recheckedOffsetMs;
  }

  return new Date(exactUtc).toISOString();
}

/**
 * Converts a date & time in timeZone plus duration into UTC calendar strings
 * (Google compact format e.g. 20261015T163000Z and standard ISO 8601 e.g. 2026-10-15T16:30:00Z).
 */
export function formatCalendarUtc(
  dateStr: string,
  timeStr: string,
  durationMinutes = 60,
  timeZone = "Asia/Tehran"
): {
  startUtc: string;
  endUtc: string;
  startIso: string;
  endIso: string;
} {
  const startIso = toUtcIso(dateStr, timeStr, timeZone);
  const startDate = new Date(startIso);
  const endDate = new Date(startDate.getTime() + (durationMinutes || 60) * 60 * 1000);

  const toCompact = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const toIsoNoMs = (d: Date) =>
    d.toISOString().replace(/\.\d{3}Z$/, "Z");

  return {
    startUtc: toCompact(startDate),
    endUtc: toCompact(endDate),
    startIso: toIsoNoMs(startDate),
    endIso: toIsoNoMs(endDate),
  };
}

/**
 * Builds direct Google Calendar and Outlook Live Web event links.
 */
export function buildCalendarLinks({
  title,
  description = "",
  location = "",
  date,
  time,
  durationMinutes = 60,
  timeZone = "Asia/Tehran",
}: {
  title: string;
  description?: string;
  location?: string;
  date: string;
  time: string;
  durationMinutes?: number;
  timeZone?: string;
}): {
  googleCalendarUrl: string;
  outlookCalendarUrl: string;
  startUtc: string;
  endUtc: string;
  startIso: string;
  endIso: string;
} {
  const { startUtc, endUtc, startIso, endIso } = formatCalendarUtc(date, time, durationMinutes, timeZone);

  const googleParams = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startUtc}/${endUtc}`,
    details: description,
    location,
  });

  const outlookParams = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    startdt: startIso,
    enddt: endIso,
    body: description,
    location,
  });

  return {
    googleCalendarUrl: `https://calendar.google.com/calendar/render?${googleParams.toString()}`,
    outlookCalendarUrl: `https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams.toString()}`,
    startUtc,
    endUtc,
    startIso,
    endIso,
  };
}

export function formatTehran(utc: string) {
  const value = new Date(utc);
  const date = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", dateStyle: "short" }).format(value);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tehran", timeStyle: "short", hour12: false }).format(value);
  return { date, time };
}

export function formatLocalizedDate(dateString: string, locale: Locale = "en", timeZone = "Asia/Tehran"): string {
  if (!dateString) return "";
  try {
    const cleanDate = toEnglishDigits(dateString);
    const parts = cleanDate.split("-");
    let dateObj: Date;
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    } else {
      dateObj = new Date(cleanDate);
    }
    if (isNaN(dateObj.getTime())) return dateString;

    const tzOption = getSafeTimeZone(timeZone);

    if (locale === "fa") {
      return new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: tzOption,
      }).format(dateObj);
    }
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: tzOption,
    }).format(dateObj);
  } catch {
    return dateString;
  }
}

export function formatLocalizedTime(timeStr: string, locale: Locale = "en"): string {
  if (!timeStr) return "";
  const cleanTime = toEnglishDigits(timeStr);
  return locale === "fa" ? toPersianDigits(cleanTime) : cleanTime;
}

/**
 * Formats a UTC ISO/SQL timestamp string (e.g. `2026-08-25 15:10:00` or `2026-08-25T15:10:00Z`)
 * to localized date and time in the user's timezone.
 */
export function formatUtcDateTime(
  utcTimestamp: string | null | undefined,
  locale: Locale = "en",
  timeZone = "Asia/Tehran"
): { date: string; time: string; full: string } {
  if (!utcTimestamp) return { date: "", time: "", full: "" };
  try {
    const clean = utcTimestamp.replace(" ", "T") + (utcTimestamp.includes("Z") || utcTimestamp.includes("+") ? "" : "Z");
    const dateObj = new Date(clean);
    if (isNaN(dateObj.getTime())) return { date: utcTimestamp, time: "", full: utcTimestamp };

    const tz = getSafeTimeZone(timeZone);

    const date = new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: tz,
    }).format(dateObj);

    const time = new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    }).format(dateObj);

    return { date, time, full: `${date} ${time}` };
  } catch {
    return { date: utcTimestamp, time: "", full: utcTimestamp };
  }
}

/**
 * Returns true if the current time is within or past windowMinutes (default 15) before scheduled start time.
 */
export function isMeetLinkActive(
  scheduledDate: string,
  scheduledTime: string,
  scheduledAtUtc?: string | null,
  windowMinutes = 15,
  timeZone = "Asia/Tehran"
): boolean {
  try {
    let startTimestamp: number;
    if (scheduledAtUtc) {
      startTimestamp = new Date(scheduledAtUtc).getTime();
    } else if (scheduledDate && scheduledTime) {
      startTimestamp = new Date(toUtcIso(scheduledDate, scheduledTime, timeZone)).getTime();
    } else {
      return true;
    }
    if (isNaN(startTimestamp)) return true;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    return now >= startTimestamp - windowMs;
  } catch {
    return true;
  }
}

