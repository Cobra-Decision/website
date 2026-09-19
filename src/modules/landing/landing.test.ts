import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { createLandingRoutes } from "./routes";

describe("Landing & Content Pages", () => {
  const db = new Database(":memory:");
  db.run("CREATE TABLE contact_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL);");
  const app = createLandingRoutes(db);

  it("renders /about page with status 200 and SEO content", async () => {
    const res = await app.request("/about");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("About Cobra Decision");
    expect(html).toContain("Specialized Conversations Without the Noise");
    expect(html).toContain("Weekly Session Formats");
    expect(html).toContain("Core Values");
  });

  it("renders /about page in Persian when requested", async () => {
    const res = await app.request("/about?lang=fa", {
      headers: { Cookie: "lang=fa" },
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("درباره تصمیم کبرا");
    expect(html).toContain("فضایی برای گفتگوهای تخصصی بدون هیاهو");
  });

  it("renders /support page with Yavar iframe embed", async () => {
    const res = await app.request("/support");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("donate.sudoshz.ir");
    expect(html).toContain("cobra-decision");
    expect(html).toContain("Direct Support via Yavar Platform");
  });

  it("redirects /donate to /support", async () => {
    const res = await app.request("/donate");
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/support");
  });
});
