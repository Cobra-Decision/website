import type { Database } from "bun:sqlite";
import { Hono, type Handler, type MiddlewareHandler } from "hono";
import { setCookie } from "hono/cookie";
import { compress } from "hono/compress";
import { serveStatic } from "hono/bun";
import { createAuthRoutes, createDashboardRoute, createProfileRoute } from "./modules/auth/routes";
import { createEventsRoutes, events } from "./modules/events/routes";
import { mailer } from "./modules/mailer/routes";
import { createLandingRoutes } from "./modules/landing/routes";
import { createAdminRoutes } from "./modules/admin/routes";
import { createUserDashboardRoutes } from "./modules/dashboard/user/routes";
import { createAccountRoutes } from "./modules/dashboard/account/routes";
import { createSeoRoutes } from "./modules/seo/routes";

export function createApp({
  database,
  captcha,
  jwtSecret = process.env.JWT_SECRET ?? "development-secret",
}: {
  database: Database;
  captcha: { middleware: MiddlewareHandler; challengeHandler: Handler };
  jwtSecret?: string;
}) {
  const app = new Hono();

  // Gzip / Deflate Compression
  app.use(compress());

  // Static Assets with 1 Year Immutable Cache
  const staticCacheMiddleware: MiddlewareHandler = async (c, next) => {
    await next();
    if (c.res.status === 200) {
      c.res.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    }
  };

  app.use("/app.css", staticCacheMiddleware, serveStatic({ root: "./public" }));
  app.use("/favicon.svg", staticCacheMiddleware, serveStatic({ path: "./public/favicon.svg" }));
  app.use("/placeholder-meet.svg", staticCacheMiddleware, serveStatic({ path: "./public/placeholder-meet.svg" }));
  app.use("/altcha.js", staticCacheMiddleware, serveStatic({ path: "node_modules/altcha/dist/main/altcha.min.js" }));
  app.use("/htmx.js", staticCacheMiddleware, serveStatic({ path: "node_modules/htmx.org/dist/htmx.min.js" }));
  app.use("/alpine.js", staticCacheMiddleware, serveStatic({ path: "node_modules/alpinejs/dist/cdn.min.js" }));
  app.use("/vazirmatn.css", staticCacheMiddleware, serveStatic({ path: "node_modules/vazirmatn/Vazirmatn-Variable-font-face.css" }));
  app.use("/fonts/*", staticCacheMiddleware, serveStatic({ root: "node_modules/vazirmatn" }));
  app.use("/uploads/*", serveStatic({ root: "./public" }));

  // SEO: robots.txt & sitemap.xml
  app.route("/", createSeoRoutes(database));

  // Locale Switcher Route
  app.get("/locale/:lang", (c) => {
    const lang = c.req.param("lang") === "fa" ? "fa" : "en";
    setCookie(c, "locale", lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "Lax" });
    const referer = c.req.header("Referer") || "/";
    return c.redirect(referer);
  });

  // Landing & Favicon
  app.route("/", createLandingRoutes(database));
  app.get("/favicon.ico", (c) => c.body(null, 204));

  // Auth Routes
  app.route("/auth", createAuthRoutes(database, captcha, jwtSecret));

  // Dashboard Routes
  app.route("/dashboard/user", createUserDashboardRoutes(database, jwtSecret));
  app.route("/dashboard/member", createUserDashboardRoutes(database, jwtSecret));
  app.route("/dashboard/account", createAccountRoutes(database, jwtSecret));
  app.route("/dashboard/member/profile", createAccountRoutes(database, jwtSecret));
  app.route("/dashboard/profile", createAccountRoutes(database, jwtSecret));
  app.route("/dashboard/admin", createAdminRoutes(database, jwtSecret));

  // Events & Meets
  app.route("/meets", createEventsRoutes(database, jwtSecret));
  app.route("/events", events);
  app.route("/mailer", mailer);

  return app;
}
