# Website

Bun + Hono modular monolith with server-rendered JSX, HTMX, Tailwind/daisyUI, Alpine, SQLite, ALTCHA, and JWT sessions.

## Local development

```bash
cp .env.example .env
bun install
bun test
bun run check
bun run dev
```

Open `http://localhost:3000`. Auth is at `/auth`, registration at `/auth/register`, and authenticated users land on `/dashboard`.

## Project rules

- Feature code stays under `src/modules/<feature>`.
- Use raw `bun:sqlite`; all active-record queries include `deleted_at IS NULL`.
- Tests are the source of truth: unit tests cover logic, database tests cover schema/seeds, and integration tests cover HTTP flows.
- Tests use in-memory SQLite, never `app.sqlite`.
- UI uses server JSX + HTMX + Tailwind/daisyUI + Alpine; no React.
- Keep commits focused by feature, test, fix, or formatting concern.
