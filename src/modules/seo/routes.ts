import type { Database } from "bun:sqlite";
import { Hono } from "hono";

export function createSeoRoutes(database: Database) {
  return new Hono()
    .get("/robots.txt", (c) => {
      const robots = [
        "User-agent: *",
        "Allow: /",
        "Allow: /meets/*",
        "Allow: /auth",
        "Disallow: /dashboard/*",
        "Disallow: /api/*",
        "",
        `Sitemap: ${new URL("/sitemap.xml", c.req.url).origin}/sitemap.xml`,
      ].join("\n");

      c.header("Content-Type", "text/plain; charset=utf-8");
      c.header("Cache-Control", "public, max-age=86400");
      return c.text(robots);
    })
    .get("/sitemap.xml", (c) => {
      const origin = new URL("/", c.req.url).origin;
      const now = new Date().toISOString();

      const meets = database
        .query<{ id: string; updated_at: string | null; created_at: string }, []>(
          "SELECT id, updated_at, created_at FROM meets WHERE status != 'cancelled' ORDER BY created_at DESC"
        )
        .all();

      const urls = [
        { loc: `${origin}/`, lastmod: now, changefreq: "daily", priority: "1.0" },
        { loc: `${origin}/auth`, lastmod: now, changefreq: "monthly", priority: "0.5" },
        ...meets.map((m) => ({
          loc: `${origin}/meets/${m.id}`,
          lastmod: m.updated_at ? new Date(m.updated_at).toISOString() : new Date(m.created_at).toISOString(),
          changefreq: "weekly",
          priority: "0.8",
        })),
      ];

      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls.map(
          (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
        ),
        "</urlset>",
      ].join("\n");

      c.header("Content-Type", "application/xml; charset=utf-8");
      c.header("Cache-Control", "public, max-age=3600");
      return c.body(xml);
    });
}
