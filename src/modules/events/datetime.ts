import type { Locale } from "../../lib/i18n/translations";
import { formatLocalizedNumber, toPersianDigits } from "../../lib/i18n/context";

const tehranOffsetMinutes = 210;

export function toUtcIso(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
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
    // If dateString is YYYY-MM-DD
    const parts = dateString.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      if (locale === "fa") {
        return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
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

    const parsed = new Date(dateString);
    if (isNaN(parsed.getTime())) return dateString;

    if (locale === "fa") {
      return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
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
  return locale === "fa" ? toPersianDigits(timeStr) : timeStr;
}
