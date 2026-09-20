import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { createApp } from "./app";

describe("Error Handling & Error Pages", () => {
  const db = new Database(":memory:");
  const dummyCaptcha = {
    middleware: async (_c: any, next: any) => await next(),
    challengeHandler: (c: any) => c.text("challenge"),
  };

  const app = createApp({
    database: db,
    captcha: dummyCaptcha,
  });

  // Attach a route that throws an error for testing 500 handler
  app.get("/test-error-500", () => {
    throw new Error("Simulated server failure");
  });
  app.get("/api/test-error-500", () => {
    throw new Error("Simulated API failure");
  });

  it("returns 404 HTML page for non-existent routes", async () => {
    const res = await app.request("/some-non-existent-page-url");
    expect(res.status).toBe(404);
    const html = await res.text();
    expect(html).toContain("Page Not Found");
    expect(html).toContain("404");
    expect(html).toContain("Back to Home");
    expect(html).toContain("Explore Meets");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("returns 404 in Persian when locale=fa cookie is set", async () => {
    const res = await app.request("/some-non-existent-route", {
      headers: {
        Cookie: "locale=fa",
      },
    });
    expect(res.status).toBe(404);
    const html = await res.text();
    expect(html).toContain("صفحه یافت نشد");
    expect(html).toContain("بازگشت به صفحه اصلی");
    expect(html).toContain("مشاهده جلسات");
  });

  it("returns 404 JSON for non-existent API routes or Accept: application/json", async () => {
    const apiRes = await app.request("/api/non-existent-endpoint");
    expect(apiRes.status).toBe(404);
    const apiJson = await apiRes.json();
    expect(apiJson).toEqual({ error: "Not Found", statusCode: 404 });

    const jsonRes = await app.request("/missing-with-header", {
      headers: {
        Accept: "application/json",
      },
    });
    expect(jsonRes.status).toBe(404);
    const jsonBody = await jsonRes.json();
    expect(jsonBody).toEqual({ error: "Not Found", statusCode: 404 });
  });

  it("returns FormMessage partial snippet for HTMX non-boosted 404 requests", async () => {
    const res = await app.request("/missing-form-target", {
      headers: {
        "HX-Request": "true",
      },
    });
    expect(res.status).toBe(404);
    const html = await res.text();
    expect(html).toContain('class="alert alert-error"');
    expect(html).toContain("The page you are looking for");
    expect(html).not.toContain("<!DOCTYPE html>");
  });

  it("returns FormMessage partial snippet for HTMX non-boosted 500 requests", async () => {
    const res = await app.request("/test-error-500", {
      headers: {
        "HX-Request": "true",
      },
    });
    expect(res.status).toBe(500);
    const html = await res.text();
    expect(html).toContain('class="alert alert-error"');
    expect(html).toContain("Something went wrong on our end. Please try again later.");
    expect(html).not.toContain("<!DOCTYPE html>");
  });

  it("returns 500 HTML page on unhandled server error", async () => {
    const res = await app.request("/test-error-500");
    expect(res.status).toBe(500);
    const html = await res.text();
    expect(html).toContain("500");
    expect(html).toContain("Internal Server Error");
    expect(html).toContain("Something went wrong on our end");
  });

  it("returns 500 JSON on unhandled server error for API requests", async () => {
    const res = await app.request("/api/test-error-500");
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: "Internal Server Error", statusCode: 500 });
  });
});
