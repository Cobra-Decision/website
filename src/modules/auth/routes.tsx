import { Hono } from "hono";

export const auth = new Hono().get("/", (c) =>
  c.html(<main><h1>Auth</h1><a href="/">Back home</a></main>),
);
