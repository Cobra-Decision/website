# Modular Monolith Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable Bun and Hono starter application with a home page linking to placeholder feature modules.

**Architecture:** A single `src/index.tsx` creates the Hono app and exports it for tests. Feature route definitions live in their module folders and are mounted by the app. `src/lib` exposes built-in SQLite and a bounded `Map` cache without application data or behavior.

**Tech Stack:** TypeScript, Bun, Hono, Hono JSX, HTMX, SQLite (`bun:sqlite`).

## Global Constraints

- Run TypeScript directly with Bun.
- Use Hono server-rendered JSX and include HTMX; no client-side feature behavior.
- Use `bun:sqlite` and a bounded `Map` cache; do not add database or cache dependencies.
- Do not add authentication, event processing, mail delivery, schemas, migrations, jobs, or feature actions.

---

## File Structure

- `package.json`: Hono dependency and Bun commands.
- `tsconfig.json`: JSX settings for Hono.
- `src/index.tsx`: application composition, home page, and Bun server startup.
- `src/lib/database.ts`: shared SQLite connection.
- `src/lib/cache.ts`: bounded in-memory LRU cache.
- `src/modules/{auth,events,mailer}/routes.tsx`: one placeholder route per future module.
- `test/app.test.tsx`: home page and placeholder-route behavior.

### Task 1: Configure the project and prove the app is missing

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `test/app.test.tsx`

**Interfaces:**
- Produces: test import contract `app` from `../src/index` with `app.request(path: string): Promise<Response>`.

- [ ] **Step 1: Create Bun configuration**

```json
{
  "name": "website",
  "private": true,
  "type": "module",
  "scripts": { "dev": "bun --watch src/index.tsx", "start": "bun src/index.tsx", "test": "bun test", "check": "bunx tsc --noEmit" },
  "dependencies": { "hono": "^4.0.0" },
  "devDependencies": { "bun-types": "^1.0.0", "typescript": "^5.0.0" }
}
```

```json
{
  "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "hono/jsx", "strict": true, "noEmit": true, "types": ["bun-types"] },
  "include": ["src", "test"]
}
```

- [ ] **Step 2: Write the failing application test**

```tsx
import { expect, test } from "bun:test";
import { app } from "../src/index";
import { getCache, setCache } from "../src/lib/cache";

test("home lists the three feature links", async () => {
  const response = await app.request("/");
  const html = await response.text();

  expect(response.status).toBe(200);
  expect(html).toContain('href="/auth"');
  expect(html).toContain('href="/events"');
  expect(html).toContain('href="/mailer"');
});

test("cache retains a recently read item", () => {
  for (let index = 0; index < 100; index++) setCache(String(index), index);
  expect(getCache("0")).toBe(0);
  setCache("100", 100);
  expect(getCache("0")).toBe(0);
  expect(getCache("1")).toBeUndefined();
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `bun test test/app.test.tsx`

Expected: FAIL because `../src/index` and `../src/lib/cache` do not exist.

- [ ] **Step 4: Install the declared dependencies**

Run: `bun install`

- [ ] **Step 5: Commit the setup and red test**

```bash
git add package.json tsconfig.json test/app.test.tsx bun.lock
git commit -m "chore: configure Bun application"
```

### Task 2: Implement the minimal modular application

**Files:**
- Create: `src/index.tsx`
- Create: `src/lib/database.ts`
- Create: `src/lib/cache.ts`
- Create: `src/modules/auth/routes.tsx`
- Create: `src/modules/events/routes.tsx`
- Create: `src/modules/mailer/routes.tsx`
- Modify: `test/app.test.tsx`

**Interfaces:**
- Consumes: `app` import contract from Task 1.
- Produces: `app: Hono`, a home route, and `GET /auth`, `GET /events`, `GET /mailer` placeholder routes.

- [ ] **Step 1: Extend the red test to cover feature pages**

```tsx
test.each(["auth", "events", "mailer"])("%s is a placeholder page", async (feature) => {
  const response = await app.request(`/${feature}`);
  expect(response.status).toBe(200);
  expect(await response.text()).toContain("Back home");
});
```

- [ ] **Step 2: Run the test to verify it still fails**

Run: `bun test test/app.test.tsx`

Expected: FAIL because `src/index.tsx` remains absent.

- [ ] **Step 3: Create the shared infrastructure and feature routes**

```ts
// src/lib/database.ts
import { Database } from "bun:sqlite";
export const database = new Database("app.sqlite");
```

```ts
// src/lib/cache.ts
const limit = 100;
const cache = new Map<string, unknown>();
export function getCache(key: string) {
  const value = cache.get(key);
  if (value !== undefined) { cache.delete(key); cache.set(key, value); }
  return value;
}
export function setCache(key: string, value: unknown) {
  cache.delete(key); cache.set(key, value);
  if (cache.size > limit) cache.delete(cache.keys().next().value!);
}
```

```tsx
// src/modules/auth/routes.tsx
import { Hono } from "hono";
export const auth = new Hono().get("/", (c) => c.html(<main><h1>Auth</h1><a href="/">Back home</a></main>));
```

```tsx
// src/modules/events/routes.tsx
import { Hono } from "hono";
export const events = new Hono().get("/", (c) => c.html(<main><h1>Events</h1><a href="/">Back home</a></main>));
```

```tsx
// src/modules/mailer/routes.tsx
import { Hono } from "hono";
export const mailer = new Hono().get("/", (c) => c.html(<main><h1>Mailer</h1><a href="/">Back home</a></main>));
```

```tsx
// src/index.tsx
import { Hono } from "hono";
import { auth } from "./modules/auth/routes";
import { events } from "./modules/events/routes";
import { mailer } from "./modules/mailer/routes";
import "./lib/database";

export const app = new Hono();
app.get("/", (c) => c.html(<html><head><script src="https://unpkg.com/htmx.org@2.0.4" /></head><body><main><h1>Website</h1><nav><a href="/auth">Auth</a> <a href="/events">Events</a> <a href="/mailer">Mailer</a></nav></main></body></html>));
app.route("/auth", auth); app.route("/events", events); app.route("/mailer", mailer);

export default { port: 3000, fetch: app.fetch };
```

- [ ] **Step 4: Run the test and type check**

Run: `bun test && bun run check`

Expected: PASS with the home links and all three placeholder routes returning 200.

- [ ] **Step 5: Start the server for a manual check**

Run: `bun run start`

Expected: the page at `http://localhost:3000` shows the three links; each opens its placeholder page.

- [ ] **Step 6: Commit the runnable base**

```bash
git add src test/app.test.tsx
git commit -m "feat: add modular monolith base"
```
