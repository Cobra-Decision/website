import { Hono } from "hono";

export const mailer = new Hono().get("/", (c) =>
  c.html(
    <main>
      <h1>Mailer</h1>
      <a href="/">Back home</a>
    </main>,
  ),
);
