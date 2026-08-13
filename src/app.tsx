import type { Database } from "bun:sqlite";
import { Hono, type Handler, type MiddlewareHandler } from "hono";
import { serveStatic } from "hono/bun";
import { Document } from "./ui/layout";
import { createAuthRoutes, createDashboardRoute } from "./modules/auth/routes";
import { events } from "./modules/events/routes";
import { mailer } from "./modules/mailer/routes";

export function createApp({ database, captcha, jwtSecret = process.env.JWT_SECRET ?? "development-secret" }: {
  database: Database;
  captcha: { middleware: MiddlewareHandler; challengeHandler: Handler };
  jwtSecret?: string;
}) {
  const app = new Hono();
  app.use("/app.css", serveStatic({ root: "./public" }));
  app.get("/", (c) => c.html(<Document><main class="container mx-auto p-8"><h1 class="text-4xl font-bold">Website</h1><nav class="mt-6 flex gap-3"><a class="btn btn-primary" href="/auth">Auth</a><a class="btn btn-secondary" href="/events">Events</a><a class="btn btn-accent" href="/mailer">Mailer</a></nav></main></Document>));
  app.get("/favicon.ico", (c) => c.body(null, 204));
  app.route("/auth", createAuthRoutes(database, captcha, jwtSecret));
  app.route("/dashboard", createDashboardRoute(database, jwtSecret));
  app.route("/events", events);
  app.route("/mailer", mailer);
  return app;
}
