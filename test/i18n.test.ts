import { expect, test } from "bun:test";
import { formatLocalizedNumber, isRtl, t, toPersianDigits } from "../src/lib/i18n/context";
import { formatLocalizedDate, formatLocalizedTime } from "../src/modules/events/datetime";

test("detects RTL for Persian and LTR for English", () => {
  expect(isRtl("fa")).toBe(true);
  expect(isRtl("en")).toBe(false);
});

test("translates keys for English and Persian with fallback", () => {
  expect(t("brand.name", "en")).toBe("CobraDecision");
  expect(t("brand.name", "fa")).toBe("کبرا دسیژن");
  expect(t("meet.status.upcoming", "en")).toBe("Upcoming");
  expect(t("meet.status.upcoming", "fa")).toBe("پیش‌رو");
  expect(t("meet.public", "fa")).toBe("عمومی");
  expect(t("meet.private", "fa")).toBe("خصوصی");
});

test("converts digits to Persian numbers correctly", () => {
  expect(toPersianDigits("1234567890")).toBe("۱۲۳۴۵۶۷۸۹۰");
  expect(formatLocalizedNumber(42, "fa")).toBe("۴۲");
  expect(formatLocalizedNumber(42, "en")).toBe("42");
});

test("formats dual calendar dates (Gregorian for EN, Jalali for FA)", () => {
  const dateStr = "2026-08-15";
  const enDate = formatLocalizedDate(dateStr, "en");
  const faDate = formatLocalizedDate(dateStr, "fa");

  expect(enDate).toContain("2026");
  expect(enDate).toContain("Aug");
  expect(faDate).toContain("۱۴۰۵");
  expect(faDate).toContain("مرداد");
});

test("formats localized time", () => {
  expect(formatLocalizedTime("18:30", "en")).toBe("18:30");
  expect(formatLocalizedTime("18:30", "fa")).toBe("۱۸:۳۰");
});
