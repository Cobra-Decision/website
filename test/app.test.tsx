import { expect, test } from "bun:test";
import { app } from "../src/index";
import { getCache, setCache } from "../src/lib/cache";

test("home renders landing navigation", async () => {
  const response = await app.request("/");
  const html = await response.text();

  expect(response.status).toBe(200);
  expect(html).toContain('href="/app.css"');
  expect(html).not.toContain("cdn.tailwindcss.com");
  expect(html).toContain("alpinejs@3.x.x");
  expect(html).toContain('href="/auth"');
  expect(html).toContain('href="#how-it-works"');
  expect(html).toContain('hx-post="/api/contact"');
});

test("favicon requests do not return a 404", async () => {
  expect((await app.request("/favicon.ico")).status).toBe(204);
  const icon = await app.request("/favicon.svg");
  expect(icon.status).toBe(200);
  expect(icon.headers.get("content-type")).toContain("image/svg+xml");
});

test("all pages use static CobraDecision tab branding", async () => {
  for (const path of ["/", "/auth", "/auth/register"]) {
    const html = await (await app.request(path)).text();
    expect(html).toContain("<title>CobraDecision</title>");
    expect(html).toContain('rel="icon" href="/favicon.svg"');
  }
});

test("compiled application CSS is served locally", async () => {
  const response = await app.request("/app.css");
  expect(response.status).toBe(200);
  expect(await response.text()).toContain("--p");
});

test("ALTCHA widget is served locally as JavaScript", async () => {
  const response = await app.request("/altcha.js");
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/javascript");
});

test("cache retains a recently read item", () => {
  for (let index = 0; index < 100; index++) setCache(String(index), index);
  expect(getCache("0")).toBe(0);
  setCache("100", 100);
  expect(getCache("0")).toBe(0);
  expect(getCache("1")).toBeUndefined();
});

test.each(["events", "mailer"])(
  "%s is a placeholder page",
  async (feature) => {
    const response = await app.request(`/${feature}`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Back home");
  },
);

test("auth provides login and registration views", async () => {
  const login = await app.request("/auth");
  const loginHtml = await login.text();
  expect(loginHtml).toContain('hx-post="/auth/login"');
  expect(loginHtml).toContain('name="identifier"');
  expect(loginHtml).toContain("altcha-widget");

  const register = await app.request("/auth/register");
  expect(await register.text()).toContain('hx-post="/auth/register"');
});

test("ALTCHA issues signed challenges and rejects an absent solution", async () => {
  const challenge = await app.request("/auth/altcha/challenge");
  const payload = await challenge.json() as Record<string, unknown>;
  expect(challenge.status).toBe(200);
  expect(payload.parameters).toBeTruthy();
  expect(payload.signature).toBeTruthy();

  const login = await app.request("/auth/login", { method: "POST", body: new FormData() });
  expect(login.status).toBe(403);
});
