import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { getLandingCache } from "../../lib/cache";
import { Document } from "../../ui/layout";
import { Landing } from "./views";

export function createLandingRoutes(database: Database) {
  return new Hono()
    .get("/", (c) => c.html(<Document title="Meetspace"><Landing data={getLandingCache()} /></Document>))
    .post("/api/contact", async (c) => {
      const email = String((await c.req.parseBody()).email ?? "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.html(<div class="text-error">Enter a valid email address.</div>, 400);
      database.run("INSERT INTO contact_requests (email) VALUES (?)", [email]);
      return c.html(<div class="text-success font-medium">Thanks! We will be in touch.</div>);
    });
}
