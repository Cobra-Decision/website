import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { getLandingCache } from "../../lib/cache";
import { Document } from "../../ui/layout";
import { FormMessage } from "../../ui/form-message";
import { Landing } from "./views";
import { getLocale } from "../../lib/i18n/context";

export function createLandingRoutes(database: Database) {
  return new Hono()
    .get("/", (c) => {
      const locale = getLocale(c);
      return c.html(
        <Document title="CobraDecision" locale={locale}>
          <Landing data={getLandingCache()} locale={locale} />
        </Document>
      );
    })
    .post("/api/contact", async (c) => {
      const email = String((await c.req.parseBody()).email ?? "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.html(<FormMessage id="contact-result" message="Enter a valid email address." />, 400);
      database.run("INSERT INTO contact_requests (email) VALUES (?)", [email]);
      return c.html(<FormMessage id="contact-result" type="success" message="Thanks! We will be in touch." />);
    });
}
