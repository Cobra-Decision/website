import type { Locale } from "../../lib/i18n/translations";
import { formatLocalizedNumber, toEnglishDigits, toPersianDigits } from "../../lib/i18n/context";

const tehranOffsetMinutes = 210;

export function toUtcIso(date: string, time: string) {
  const cleanDate = toEnglishDigits(date);
  const cleanTime = toEnglishDigits(time);
  const [year, month, day] = cleanDate.split("-").map(Number);
  const [hour, minute] = cleanTime.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute - tehranOffsetMinutes)).toISOString();
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

    const tzOption = (() => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone });
        return timeZone;
      } catch {
        return "Asia/Tehran";
      }
    })();

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

    const tz = (() => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone });
        return timeZone;
      } catch {
        return "Asia/Tehran";
      }
    })();

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
  windowMinutes = 15
): boolean {
  try {
    let startTimestamp: number;
    if (scheduledAtUtc) {
      startTimestamp = new Date(scheduledAtUtc).getTime();
    } else if (scheduledDate && scheduledTime) {
      startTimestamp = new Date(toUtcIso(scheduledDate, scheduledTime)).getTime();
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

