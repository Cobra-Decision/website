# Modular Monolith Base Design

## Goal

Create a minimal Bun and Hono application that renders a home page listing future feature modules.

## Architecture

One Bun process serves a Hono application. Hono JSX renders HTML on the server; HTMX is included only as the chosen frontend foundation, with no dynamic behavior until a feature needs it.

The source tree has `modules/auth`, `modules/events`, and `modules/mailer` folders. Each module owns its future routes and code. The base exposes only placeholder pages for those paths.

SQLite access and an in-memory LRU cache are initialized as shared infrastructure, but neither stores application data yet.

## Pages

- `/` lists Auth, Events, and Mailer as ordinary anchor links.
- `/auth`, `/events`, and `/mailer` each render a simple placeholder page with a link back home.

## Constraints

- TypeScript running directly on Bun.
- Hono with server-rendered JSX.
- SQLite via Bun's built-in SQLite API.
- A small in-memory LRU cache implemented with `Map`; no Redis or cache package.
- No authentication, event behavior, mail delivery, schema, migrations, background jobs, or client-side feature behavior.

## Error Handling and Testing

Use Hono's default 404 behavior. Add one Bun test that confirms the home page renders all three feature links and a lightweight type check.
