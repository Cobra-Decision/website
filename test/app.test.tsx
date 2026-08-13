import { expect, test } from "bun:test";
import { app } from "../src/index";
import { getCache, setCache } from "../src/lib/cache";

test("home lists the three feature links", async () => {
  const response = await app.request("/");
  const html = await response.text();

  expect(response.status).toBe(200);
  expect(html).toContain("cdn.tailwindcss.com");
  expect(html).toContain("daisyui@4.12.24");
  expect(html).toContain("alpinejs@3.x.x");
  expect(html).toContain('href="/auth"');
  expect(html).toContain('href="/events"');
  expect(html).toContain('href="/mailer"');
});

test("cache retains a recently read item", () => {
  for (let index = 0; index < 100; index++) setCache(String(index), index);
  expect(getCache("0")).toBe(0);
  setCache("100", 100);
  expect(getCache("0")).toBe(0);
  expect(getCache("1")).toBeUndefined();
});

test.each(["auth", "events", "mailer"])(
  "%s is a placeholder page",
  async (feature) => {
    const response = await app.request(`/${feature}`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Back home");
  },
);
