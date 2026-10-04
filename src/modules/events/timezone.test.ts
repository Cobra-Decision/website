import { describe, expect, it } from "bun:test";
import {
  toUtcIso,
  formatUtcDateTime,
  formatCalendarUtc,
  buildCalendarLinks,
  formatLocalizedDate,
  formatLocalizedTime,
  isMeetLinkActive,
} from "./datetime";

describe("Timezone & DateTime Unified Architecture", () => {
  describe("toUtcIso", () => {
    it("converts Tehran local time (+03:30) to UTC ISO", () => {
      // 2026-10-15 15:30 in Tehran (+03:30) should be 12:00 UTC
      const utc = toUtcIso("2026-10-15", "15:30", "Asia/Tehran");
      expect(utc).toBe("2026-10-15T12:00:00.000Z");
    });

    it("converts UTC local time to UTC ISO", () => {
      const utc = toUtcIso("2026-10-15", "15:30", "UTC");
      expect(utc).toBe("2026-10-15T15:30:00.000Z");
    });

    it("converts New York local time (EDT UTC-4 in October) to UTC ISO", () => {
      // 2026-10-15 11:30 in EDT (-04:00) should be 15:30 UTC
      const utc = toUtcIso("2026-10-15", "11:30", "America/New_York");
      expect(utc).toBe("2026-10-15T15:30:00.000Z");
    });

    it("converts Tokyo local time (JST +09:00) to UTC ISO", () => {
      // 2026-10-15 21:00 in Tokyo (+09:00) should be 12:00 UTC
      const utc = toUtcIso("2026-10-15", "21:00", "Asia/Tokyo");
      expect(utc).toBe("2026-10-15T12:00:00.000Z");
    });

    it("handles Persian digits in input dates and times", () => {
      const utc = toUtcIso("۲۰۲۶-۱۰-۱۵", "۱۵:۳۰", "Asia/Tehran");
      expect(utc).toBe("2026-10-15T12:00:00.000Z");
    });
  });

  describe("formatUtcDateTime & Roundtrip", () => {
    it("roundtrips local time correctly across timezones", () => {
      const testCases = [
        { date: "2026-10-15", time: "15:30", tz: "Asia/Tehran" },
        { date: "2026-10-15", time: "09:15", tz: "America/New_York" },
        { date: "2026-10-15", time: "23:45", tz: "Asia/Tokyo" },
        { date: "2026-10-15", time: "18:00", tz: "Europe/London" },
      ];

      for (const tc of testCases) {
        const utcIso = toUtcIso(tc.date, tc.time, tc.tz);
        const formatted = formatUtcDateTime(utcIso, "en", tc.tz);
        expect(formatted.time).toBe(tc.time);
      }
    });

    it("formats SQLite format (space-separated) timestamps", () => {
      const formatted = formatUtcDateTime("2026-10-15 12:00:00", "en", "Asia/Tehran");
      expect(formatted.time).toBe("15:30");
    });
  });

  describe("formatCalendarUtc & buildCalendarLinks", () => {
    it("generates timezone-aware start and end calendar strings", () => {
      const cal = formatCalendarUtc("2026-10-15", "15:30", 90, "Asia/Tehran");
      // 15:30 +03:30 is 12:00 UTC, 90 min duration -> 13:30 UTC
      expect(cal.startUtc).toBe("20261015T120000Z");
      expect(cal.endUtc).toBe("20261015T133000Z");
      expect(cal.startIso).toBe("2026-10-15T12:00:00Z");
      expect(cal.endIso).toBe("2026-10-15T13:30:00Z");
    });

    it("creates calendar links for external calendar providers", () => {
      const links = buildCalendarLinks({
        title: "Community Meetup",
        date: "2026-10-15",
        time: "15:30",
        durationMinutes: 60,
        timeZone: "Asia/Tehran",
      });
      expect(links.googleCalendarUrl).toContain("20261015T120000Z");
      expect(links.outlookCalendarUrl).toContain("2026-10-15T12%3A00%3A00Z");
    });
  });

  describe("isMeetLinkActive", () => {
    it("uses scheduled_at_utc when present", () => {
      const futureUtc = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      expect(isMeetLinkActive("2020-01-01", "10:00", futureUtc, 15)).toBe(false);

      const imminentUtc = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      expect(isMeetLinkActive("2020-01-01", "10:00", imminentUtc, 15)).toBe(true);
    });
  });
});
