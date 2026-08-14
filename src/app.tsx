import type { Database } from "bun:sqlite";
import { Hono, type Handler, type MiddlewareHandler } from "hono";
import { serveStatic } from "hono/bun";
import { Document } from "./ui/layout";
import { createAuthRoutes, createDashboardRoute, createProfileRoute } from "./modules/auth/routes";
import { events } from "./modules/events/routes";
import { mailer } from "./modules/mailer/routes";
import { createLandingRoutes } from "./modules/landing/routes";
import { createAdminRoutes } from "./modules/admin/routes";

export function createApp({ database, captcha, jwtSecret = process.env.JWT_SECRET ?? "development-secret" }: {
  database: Database;
  captcha: { middleware: MiddlewareHandler; challengeHandler: Handler };
  jwtSecret?: string;
}) {
  const app = new Hono();
  app.use("/app.css", serveStatic({ root: "./public" }));
  app.use("/favicon.svg", serveStatic({ path: "./public/favicon.svg" }));
  app.use("/altcha.js", serveStatic({ path: "node_modules/altcha/dist/main/altcha.min.js" }));
  app.route("/", createLandingRoutes(database));
  app.get("/favicon.ico", (c) => c.body(null, 204));
  app.route("/auth", createAuthRoutes(database, captcha, jwtSecret));
  app.route("/dashboard/member", createDashboardRoute(database, jwtSecret, "member"));
  app.route("/dashboard/profile", createProfileRoute(database, jwtSecret));
  app.route("/dashboard/admin", createAdminRoutes(database, jwtSecret));
  app.route("/events", events);
  app.route("/mailer", mailer);
  return app;
}
