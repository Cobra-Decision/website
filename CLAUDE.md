# CobraDecision - System & Architecture Guidelines

High-performance, memory-efficient modular monolith built with **Bun**, **Hono**, server-rendered **JSX**, **HTMX**, **Tailwind CSS + daisyUI**, **Alpine.js**, **SQLite (WAL)**, **ALTCHA**, and **JWT**.

---

## 🛠️ Core Commands

```bash
# Typecheck
bun run check

# Tests
bun test

# CSS Build
bun run build:css

# Migrations & Seeding
bun run migrate
bun run seed

# Local Dev Server
bun run dev
```

---

## 🏛️ Architecture & Best Practices

1. **Modular Monolith**:
   - Organize code logically by domain (`src/routes/`, `src/services/`, `src/ui/`, `src/db/`, `src/middleware/`).
   - Unified components: avoid duplicate UI blocks. Keep markup DRY.

2. **Server-Side Rendered JSX & HTMX**:
   - Return clean HTML/JSX snippets on `hx-*` requests.
   - Use Alpine.js for localized client-side interactivity; avoid heavy client libraries.

3. **Memory & Performance**:
   - SQLite runs in WAL mode with fast parameterized queries (`db.query(...)`).
   - Use streams or paginated batches for large datasets. Avoid loading unbounded query results into RAM.

4. **Security**:
   - Strict granular auth guards on routes.
   - Use ALTCHA verification on public submission forms.
   - All database queries must use prepared statements/parameters to prevent SQL injection.
   - Never expose JWT secrets or HMAC keys to client-side code.

5. **UI & Accessibility**:
   - Mobile-first, responsive daisyUI and Tailwind classes.
   - Support RTL and Persian typography (`Vazirmatn` font).
