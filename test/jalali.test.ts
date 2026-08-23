import { describe, expect, it } from "bun:test";
import {
  gregorianToJalali,
  jalaliToGregorian,
  getJalaliMonthDays,
  isJalaliLeapYear,
  formatJalaliDisplay,
} from "../src/lib/datetime/jalali";

describe("Jalali conversion math", () => {
  it("converts known Gregorian dates to Jalali correctly", () => {
    // 2026-08-23 -> 1405-06-01 (Shahrivar 1)
    const [jy, jm, jd] = gregorianToJalali(2026, 8, 23);
    expect(jy).toBe(1405);
    expect(jm).toBe(6);
    expect(jd).toBe(1);

    // 2024-03-20 -> 1403-01-01 (Nowruz)
    const [ny, nm, nd] = gregorianToJalali(2024, 3, 20);
    expect(ny).toBe(1403);
    expect(nm).toBe(1);
    expect(nd).toBe(1);
  });

  it("converts Jalali back to Gregorian reversibly", () => {
    const dates = [
      [2026, 8, 23],
      [2024, 3, 20],
      [2025, 12, 31],
      [2023, 1, 1],
    ];
    for (const [gy, gm, gd] of dates) {
      const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
      const [rGy, rGm, rGd] = jalaliToGregorian(jy, jm, jd);
      expect([rGy, rGm, rGd]).toEqual([gy, gm, gd]);
    }
  });

  it("computes month days correctly including leap years", () => {
    expect(getJalaliMonthDays(1403, 1)).toBe(31);
    expect(getJalaliMonthDays(1403, 7)).toBe(30);
    expect(getJalaliMonthDays(1403, 12)).toBe(30); // 1403 is leap year
    expect(getJalaliMonthDays(1404, 12)).toBe(29); // 1404 is normal year
  });

  it("formats Jalali display date string", () => {
    expect(formatJalaliDisplay("2026-08-23")).toBe("1405/06/01");
  });
});
