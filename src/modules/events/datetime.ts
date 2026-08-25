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

export function formatLocalizedDate(dateString: string, locale: Locale = "en"): string {
  if (!dateString) return "";
  try {
    const cleanDate = toEnglishDigits(dateString);
    // If dateString is YYYY-MM-DD
    const parts = cleanDate.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      if (locale === "fa") {
        return new Intl.DateTimeFormat("fa-IR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        }).format(dateObj);
      }
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(dateObj);
    }

    const parsed = new Date(cleanDate);
    if (isNaN(parsed.getTime())) return dateString;

    if (locale === "fa") {
      return new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }).format(parsed);
    }
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(parsed);
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

