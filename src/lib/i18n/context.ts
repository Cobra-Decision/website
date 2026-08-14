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

export function formatLocalizedNumber(value: string | number, locale: Locale = "en"): string {
  return locale === "fa" ? toPersianDigits(value) : String(value);
}
