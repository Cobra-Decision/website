import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { translations, type Locale, type TranslationKey } from "./translations";

export function getLocale(c?: Context): Locale {
  if (!c) return "en";
  const queryLang = c.req.query("lang") ?? c.req.query("locale");
  if (queryLang === "fa" || queryLang === "en") return queryLang;

  const cookieLang = getCookie(c, "locale") ?? getCookie(c, "lang");
  if (cookieLang === "fa" || cookieLang === "en") return cookieLang;

  const accept = c.req.header("Accept-Language");
  if (accept && accept.toLowerCase().includes("fa")) return "fa";

  return "en";
}

export function getTimezone(c?: Context, defaultTz = "Asia/Tehran"): string {
  if (!c) return defaultTz;
  const headerTz = c.req.header("hx-timezone") || c.req.header("x-timezone");
  if (headerTz && headerTz.trim()) return decodeURIComponent(headerTz.trim());

  const cookieTz = getCookie(c, "tz") ?? getCookie(c, "timezone");
  if (cookieTz && cookieTz.trim()) return decodeURIComponent(cookieTz.trim());

  return defaultTz;
}

export function isRtl(locale: Locale): boolean {
  return locale === "fa";
}

export function t(key: TranslationKey, locale: Locale = "en"): string {
  const dict = translations[locale] ?? translations.en;
  return (dict as any)[key] ?? (translations.en as any)[key] ?? key;
}

const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => persianDigits[Number(d)] ?? d);
}

/**
 * Normalizes Persian (۰-۹) and Arabic-Indic (٠-٩) digits to standard ASCII English digits (0-9).
 */
export function toEnglishDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

export function formatLocalizedNumber(value: string | number, locale: Locale = "en"): string {
  return locale === "fa" ? toPersianDigits(toEnglishDigits(value)) : toEnglishDigits(value);
}
