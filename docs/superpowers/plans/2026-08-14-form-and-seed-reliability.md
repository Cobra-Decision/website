# Form and Seed Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every form return useful HTMX success/error UI, seed valid related rows in every table, and brand every document as CobraDecision.

**Architecture:** Keep the existing database initializers and `seedSampleData` entry point, extending them idempotently instead of adding a seed framework. Add one shared form-error renderer and route all admin CRUD failures through the existing modal/table/toast fragments; public forms retain their existing targets. Tests submit real Hono requests against in-memory SQLite databases and assert both UI contracts and persisted state.

**Tech Stack:** Bun, TypeScript, Hono JSX, `bun:sqlite`, HTMX, Tailwind CSS, daisyUI, Bun test.

## Global Constraints

- `bun run check` remains read-only and never mutates SQLite.
- `bun run seed` is the explicit command for seeding the configured application database.
- Seeds are idempotent and preserve unrelated existing data.
- Passwords are stored only as hashes produced by `Bun.password.hash`.
- Database exception details are never returned to browsers.
- All document titles are exactly `CobraDecision`.
- No new runtime dependencies.

---

### Task 1: Complete, Explicit Database Seeding

**Files:**
- Modify: `src/lib/seed.ts`
- Create: `src/seed.ts`
- Modify: `src/index.tsx`
- Modify: `package.json`
- Modify: `test/sample-seed.test.ts`

**Interfaces:**
- Consumes: `initializeDatabase(database, admin?)`, `initializeEventsDatabase(database)`, `initializeLandingDatabase(database)`, and `seedSampleData(database)`.
- Produces: idempotent `seedSampleData(database: Database): Promise<void>` and the `bun run seed` command.

- [ ] **Step 1: Write the failing complete-seed test**

Extend `test/sample-seed.test.ts` so the table list includes `role_endpoints` and `error_messages`, capture all table counts after the first run, run the seed again, and assert unchanged counts. Assert all four error types exist, every meet has a non-empty description and `scheduled_at_utc`, every sample user password verifies against `sample-password`, and orphan checks return zero:

```ts
const tables = ["roles", "users", "endpoints", "role_endpoints", "error_messages", "tags", "meets", "meet_attendees", "meet_tags", "contact_requests"];
const counts = Object.fromEntries(tables.map((table) => [table, database.query<{ total: number }, []>(`SELECT COUNT(*) total FROM ${table}`).get()!.total]));
await seedSampleData(database);
for (const table of tables) expect(database.query<{ total: number }, []>(`SELECT COUNT(*) total FROM ${table}`).get()!.total).toBe(counts[table]);
expect(database.query("SELECT COUNT(DISTINCT type) total FROM error_messages WHERE deleted_at IS NULL").get()).toEqual({ total: 4 });
expect(database.query("SELECT COUNT(*) total FROM meets WHERE description='' OR scheduled_at_utc IS NULL").get()).toEqual({ total: 0 });
expect(database.query("SELECT COUNT(*) total FROM meet_tags mt LEFT JOIN meets m ON m.id=mt.meet_id LEFT JOIN tags t ON t.id=mt.tag_id WHERE m.id IS NULL OR t.id IS NULL").get()).toEqual({ total: 0 });
```

- [ ] **Step 2: Run the seed test and verify RED**

Run: `bun test test/sample-seed.test.ts`

Expected: FAIL because `error_messages` lacks all four types, meet descriptions are empty, and the sample seed does not explicitly cover all relationships.

- [ ] **Step 3: Extend the existing seed minimally**

In `src/lib/seed.ts`, upsert sample error messages by title, add descriptions and meet URLs to each meet fixture, ensure representative admin/member users use their intended roles, and retain `INSERT OR IGNORE`/existence checks for all junction rows. Do not delete or replace existing rows.

Create `src/seed.ts` with the same initialization order used at startup:

```ts
import { database } from "./lib/database";
import { initializeDatabase } from "./modules/auth/database";
import { initializeEventsDatabase } from "./modules/events/database";
import { initializeLandingDatabase } from "./modules/landing/database";
import { seedSampleData } from "./lib/seed";

await initializeDatabase(database, { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD });
initializeEventsDatabase(database);
initializeLandingDatabase(database);
await seedSampleData(database);
console.log("CobraDecision database seeded.");
```

Add `"seed": "bun src/seed.ts"` to `package.json`. Remove automatic `seedSampleData` execution from `src/index.tsx`; startup initializes schemas and cache but sample mutation happens only through `bun run seed`.

- [ ] **Step 4: Verify seed behavior**

Run: `bun test test/sample-seed.test.ts && bun run check`

Expected: PASS with every table populated, relationships valid, passwords verified, and second-run counts unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seed.ts src/seed.ts src/index.tsx package.json test/sample-seed.test.ts
git commit -m "feat: seed complete related sample data"
```

---

### Task 2: Shared Form Errors and Admin CRUD Validation

**Files:**
- Modify: `src/modules/admin/views.tsx`
- Modify: `src/modules/admin/routes.tsx`
- Modify: `test/auth.integration.test.ts`

**Interfaces:**
- Produces: `FormError({ message }: { message: string })` and admin modal responses that retain submitted values and append `Toast` out-of-band.
- Consumes: existing `Toast`, `CrudTable`, `MeetRelations`, and admin resource configuration.

- [ ] **Step 1: Write failing admin form contract tests**

Add table-driven requests for users, meets, tags, roles, and endpoints. For each valid submission, assert status 200 and the inserted row. For invalid submissions, assert status 400, `role="alert"`, `alert-error`, the relevant modal or relationship panel ID, and `id="toast-container" hx-swap-oob="beforeend"`.

Include these concrete failures:

```ts
const duplicateRole = new FormData(); duplicateRole.set("title", "member");
const duplicateResponse = await app.request("/dashboard/admin/roles", { method: "POST", headers: { cookie }, body: duplicateRole });
expect(duplicateResponse.status).toBe(400);
const duplicateHtml = await duplicateResponse.text();
expect(duplicateHtml).toContain('id="record-modal"');
expect(duplicateHtml).toContain('role="alert"');

const invalidMeet = new FormData(); invalidMeet.set("title", "Missing schedule");
const meetResponse = await app.request("/dashboard/admin/meets", { method: "POST", headers: { cookie }, body: invalidMeet });
expect(meetResponse.status).toBe(400);
expect(await meetResponse.text()).toContain("Scheduled date and time are required.");
```

Also test empty bulk selection, invalid role/endpoint mapping, invalid meet tag/attendee IDs, protected Super Admin edits/deletes, and a non-existent edit ID.

- [ ] **Step 2: Run focused integration tests and verify RED**

Run: `bun test test/auth.integration.test.ts`

Expected: FAIL because the generic `app.onError` returns only a toast, losing the modal and submitted fields; several relationship errors return inconsistent markup.

- [ ] **Step 3: Add one shared error component and route helper**

In `src/modules/admin/views.tsx` add:

```tsx
export const FormError = ({ message }: { message: string }) => <div class="alert alert-error sm:col-span-2" role="alert">{message}</div>;
```

In `src/modules/admin/routes.tsx`, add a small `formFailure(resource, message, values, id?)` helper returning the populated `form(...)`, `FormError`, and error `Toast`. Validate required fields and numeric foreign keys before SQL. Wrap resource inserts/updates in `try/catch` and translate failures to resource-specific safe messages such as “That email, username, or phone is already used” and “A record with that title already exists.” Remove the generic success-looking error fallback from form paths.

For relationship failures, return `relationPanel(meetId)` plus `Toast(type="error")`. For role-endpoint failures, return the existing role form plus the same error UI. Empty bulk selection returns the unchanged table plus a warning toast.

- [ ] **Step 4: Verify admin forms**

Run: `bun test test/auth.integration.test.ts && bun run check`

Expected: PASS; invalid submissions keep their actionable UI and never expose SQLite exception text.

- [ ] **Step 5: Commit**

```bash
git add src/modules/admin/views.tsx src/modules/admin/routes.tsx test/auth.integration.test.ts
git commit -m "fix: return actionable admin form errors"
```

---

### Task 3: Public Authentication, Profile, Contact, and Logout Forms

**Files:**
- Modify: `src/modules/auth/views.tsx`
- Modify: `src/modules/auth/routes.tsx`
- Modify: `src/modules/landing/views.tsx`
- Modify: `src/modules/landing/routes.tsx`
- Modify: `test/auth.integration.test.ts`
- Modify: `test/landing.test.ts`

**Interfaces:**
- Consumes: the shared `FormError` presentation contract (`role="alert"` and `alert-error` classes), without coupling public modules to admin routes.
- Produces: stable HTMX target fragments for every public form failure.

- [ ] **Step 1: Write failing public-form tests**

Assert invalid login, registration mismatch/duplicate, profile duplicate username/phone, contact invalid/duplicate email, and logout behavior. Each failure must have an actionable target fragment and accessible error:

```ts
expect(await invalidLogin.text()).toContain('id="auth-result"');
expect(await invalidLogin.text()).toContain('role="alert"');
expect(await duplicateProfile.text()).toContain('id="profile-result"');
expect(await invalidContact.text()).toContain('role="alert"');
```

Assert successful registration/login use `HX-Redirect`, successful profile submission returns `alert-success`, successful contact returns a replacement form/status fragment, and logout clears the cookie.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `bun test test/auth.integration.test.ts test/landing.test.ts`

Expected: FAIL because current error bodies omit stable target IDs, profile uniqueness exceptions are unhandled, and contact duplicates have no defined response.

- [ ] **Step 3: Return consistent public fragments**

Wrap auth errors in `<div id="auth-result"><p class="alert alert-error" role="alert">…</p></div>`, profile responses in `<div id="profile-result">…</div>`, and contact responses in a stable `<div id="contact-result">…</div>`. Update forms to target those IDs. Catch profile/contact uniqueness failures and return safe messages with status 409. Keep captcha middleware, cookie flags, and redirects unchanged.

- [ ] **Step 4: Verify public forms**

Run: `bun test test/auth.integration.test.ts test/landing.test.ts && bun run check`

Expected: PASS for both successful and invalid requests.

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/views.tsx src/modules/auth/routes.tsx src/modules/landing/views.tsx src/modules/landing/routes.tsx test/auth.integration.test.ts test/landing.test.ts
git commit -m "fix: return consistent public form feedback"
```

---

### Task 4: Static CobraDecision Branding and Final Verification

**Files:**
- Modify: `src/ui/layout.tsx`
- Modify: `src/app.tsx`
- Create: `public/favicon.svg`
- Modify: `test/app.test.tsx`
- Modify: `public/app.css` (generated)

**Interfaces:**
- Produces: every HTML document has `<title>CobraDecision</title>` and `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`.

- [ ] **Step 1: Write the failing branding test**

In `test/app.test.tsx`, request `/`, `/auth`, and `/auth/register` and assert:

```ts
expect(html).toContain("<title>CobraDecision</title>");
expect(html).toContain('rel="icon" href="/favicon.svg"');
expect((await app.request("/favicon.svg")).status).toBe(200);
```

- [ ] **Step 2: Run the branding test and verify RED**

Run: `bun test test/app.test.tsx`

Expected: FAIL because titles are route-specific and no SVG favicon route exists.

- [ ] **Step 3: Apply static title and local icon**

Change `Layout` to ignore route title values and render exactly `CobraDecision`. Add a simple CobraDecision sample SVG at `public/favicon.svg`, add the icon link in `<head>`, and serve it using the existing static-file pattern in `src/app.tsx`.

- [ ] **Step 4: Run complete verification**

Run:

```bash
bun test
bun run check
bun run build:css
git diff --check
```

Expected: all tests pass, TypeScript reports no errors, CSS builds successfully, and the diff has no whitespace errors.

- [ ] **Step 5: Commit**

```bash
git add src/ui/layout.tsx src/app.tsx public/favicon.svg public/app.css test/app.test.tsx
git commit -m "feat: apply CobraDecision document branding"
```
