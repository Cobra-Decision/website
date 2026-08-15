import { expect, test } from "bun:test";
import { parseInitialPhone, COUNTRIES } from "../src/ui/phone-input";

test("COUNTRIES list provides ISO code, dialCode, and formatting metadata", () => {
  expect(COUNTRIES.length).toBeGreaterThanOrEqual(10);
  const iran = COUNTRIES.find((c) => c.code === "IR");
  expect(iran).toBeDefined();
  expect(iran?.dialCode).toBe("+98");
  expect(iran?.flag).toBe("🇮🇷");

  const us = COUNTRIES.find((c) => c.code === "US");
  expect(us).toBeDefined();
  expect(us?.dialCode).toBe("+1");
});

test("parseInitialPhone parses international phone numbers into country code and local number", () => {
  expect(parseInitialPhone("+989123456789")).toEqual({
    countryCode: "IR",
    nationalNumber: "9123456789",
  });

  expect(parseInitialPhone("+14155552671")).toEqual({
    countryCode: "US",
    nationalNumber: "4155552671",
  });

  expect(parseInitialPhone("+447911123456")).toEqual({
    countryCode: "GB",
    nationalNumber: "7911123456",
  });

  expect(parseInitialPhone("+4915123456789")).toEqual({
    countryCode: "DE",
    nationalNumber: "15123456789",
  });

  expect(parseInitialPhone("")).toEqual({
    countryCode: "IR",
    nationalNumber: "",
  });

  expect(parseInitialPhone(null)).toEqual({
    countryCode: "IR",
    nationalNumber: "",
  });
});
