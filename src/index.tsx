import { Hono } from "hono";
import "./lib/database";
import { auth } from "./modules/auth/routes";
import { events } from "./modules/events/routes";
import { mailer } from "./modules/mailer/routes";

export const app = new Hono();

app.get("/", (c) =>
  c.html(
    <html>
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@4.12.24/dist/full.min.css"
          rel="stylesheet"
          type="text/css"
        />
        <script src="https://cdn.tailwindcss.com" />
        <script src="https://unpkg.com/htmx.org@2.0.4" />
        <script async defer src="https://cdn.jsdelivr.net/gh/altcha-org/altcha/dist/altcha.min.js" type="module" />
        <script
          defer
          src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"
        />
      </head>
      <body class="min-h-screen bg-base-200">
        <main class="container mx-auto p-8">
          <h1 class="text-4xl font-bold">Website</h1>
          <nav class="mt-6 flex gap-3" x-data>
            <a class="btn btn-primary" href="/auth">Auth</a>
            <a class="btn btn-secondary" href="/events">Events</a>
            <a class="btn btn-accent" href="/mailer">Mailer</a>
          </nav>
        </main>
      </body>
    </html>,
  ),
);
app.route("/auth", auth);
app.route("/events", events);
app.route("/mailer", mailer);

export default { port: 3000, fetch: app.fetch };
