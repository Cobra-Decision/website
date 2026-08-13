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
        <script src="https://unpkg.com/htmx.org@2.0.4" />
      </head>
      <body>
        <main>
          <h1>Website</h1>
          <nav>
            <a href="/auth">Auth</a> <a href="/events">Events</a>{" "}
            <a href="/mailer">Mailer</a>
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
