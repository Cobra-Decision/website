import type { Database } from "bun:sqlite";
import { Hono, type Handler, type MiddlewareHandler } from "hono";
import { serveStatic } from "hono/bun";
import { createAuthRoutes, createDashboardRoute, createProfileRoute } from "./modules/auth/routes";
import { createEventsRoutes, events } from "./modules/events/routes";
import { mailer } from "./modules/mailer/routes";
import { createLandingRoutes } from "./modules/landing/routes";
import { createAdminRoutes } from "./modules/admin/routes";
import { createUserDashboardRoutes } from "./modules/dashboard/user/routes";
import { createAccountRoutes } from "./modules/dashboard/account/routes";

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

  // Static Assets
  app.use("/app.css", serveStatic({ root: "./public" }));
  app.use("/favicon.svg", serveStatic({ path: "./public/favicon.svg" }));
  app.use("/altcha.js", serveStatic({ path: "node_modules/altcha/dist/main/altcha.min.js" }));
  app.use("/uploads/*", serveStatic({ root: "./public" }));

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
