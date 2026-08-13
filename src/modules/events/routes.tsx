import { Hono } from "hono";

export const events = new Hono().get("/", (c) =>
  c.html(
    <main>
      <h1>Events</h1>
      <a href="/">Back home</a>
    </main>,
  ),
);
