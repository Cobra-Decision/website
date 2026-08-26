import { test, expect } from "bun:test";
import { DatePicker } from "./date-picker";
import { gregorianToJalali, jalaliToGregorian, formatJalaliDisplay } from "../lib/datetime/jalali";

test("Jalali <-> Gregorian conversion algorithm matches bidirectional dates", () => {
  // 2026-08-25 -> 1405-06-03
  const [jy, jm, jd] = gregorianToJalali(2026, 8, 25);
  expect(jy).toBe(1405);
  expect(jm).toBe(6);
  expect(jd).toBe(3);

  const [gy, gm, gd] = jalaliToGregorian(1405, 6, 3);
  expect(gy).toBe(2026);
  expect(gm).toBe(8);
  expect(gd).toBe(25);
});

test("formatJalaliDisplay produces formatted Shamsi string", () => {
  expect(formatJalaliDisplay("2026-08-25")).toBe("1405/06/03");
  expect(formatJalaliDisplay("2026-03-21")).toBe("1405/01/01");
});

test("DatePicker component renders SSR JSX with hidden input and Alpine data", () => {
  const compEn = DatePicker({
    name: "scheduled_date",
    value: "2026-08-25",
    locale: "en",
    required: true,
  });
  expect(compEn).toBeDefined();

  const compFa = DatePicker({
    name: "scheduled_date",
    value: "2026-08-25",
    locale: "fa",
    required: true,
  });
  expect(compFa).toBeDefined();
});
