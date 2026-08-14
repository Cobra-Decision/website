# Dashboard Security and Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide secure role-aware dashboards, reliable Tehran/Shamsi meet scheduling, editable user profiles, functional relations/toasts, and a Super-Admin-only read-only SQL reporting page.

**Architecture:** Keep Hono routes server-rendered with HTMX snippets. Store scheduling as a UTC ISO timestamp while UI conversion happens in a small events date helper. Keep report validation in one pure function and enforce both endpoint permission and `Super Admin` role before executing it.

**Tech Stack:** Bun, TypeScript, Hono JSX, `bun:sqlite`, HTMX, Tailwind CSS, daisyUI, Alpine.js.

## Global Constraints

- No React, ORM, or additional client framework/dependency.
- Use `Bun.password.hash()` and `Bun.password.verify()` for every password flow.
- Keep IDs, `password_hash`, timestamps, `deleted_at`, and protected Super Admin records server-managed.
- Use `Asia/Tehran` with the Persian calendar for user-facing meet dates; persist UTC timestamps.
- Every mutation returns an OOB daisyUI toast from the cached error dictionary.
- Report SQL is Super-Admin-only, one statement, `SELECT`/`WITH` only, and server row-limited.

---

### Task 1: UTC meet schedule migration and Tehran display helpers

**Files:**
- Modify: `src/modules/events/schema.sql`
- Modify: `src/modules/events/database.ts`
- Modify: `src/modules/events/types.ts`
- Create: `src/modules/events/datetime.ts`
- Modify: `src/modules/events/queries.ts`
- Test: `test/events.queries.test.ts`

**Interfaces:**
- Produces `toUtcIso(date: string, time: string): string` and `formatTehran(utc: string): { date: string; time: string }`.
- Produces `meets.scheduled_at_utc TEXT` with backfill from legacy `scheduled_date` and `scheduled_time` as Tehran local time.

- [ ] **Step 1: Write failing conversion tests**

```ts
import { expect, test } from "bun:test";
import { formatTehran, toUtcIso } from "../src/modules/events/datetime";

test("stores Tehran input as UTC and renders Persian date", () => {
  expect(toUtcIso("2026-08-14", "12:00")).toBe("2026-08-14T08:30:00.000Z");
  expect(formatTehran("2026-08-14T08:30:00.000Z").time).toContain("12:00");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test test/events.queries.test.ts`

Expected: FAIL because `datetime.ts` does not exist.

- [ ] **Step 3: Implement the helper and migration**

```ts
export const formatTehran = (utc: string) => ({
  date: new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", dateStyle: "short" }).format(new Date(utc)),
  time: new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", timeStyle: "short", hour12: false }).format(new Date(utc)),
});
```

Add `scheduled_at_utc TEXT` through `ALTER TABLE` when absent, backfill `datetime(scheduled_date || ' ' || scheduled_time, '-3 hours', '-30 minutes')`, and write new meet records using the UTC column while retaining legacy fields for compatibility.

- [ ] **Step 4: Run focused tests**

Run: `bun test test/events.queries.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/events test/events.queries.test.ts
git commit -m "feat: store meet schedules in utc"
```

### Task 2: Registration confirmation and self-service profile

**Files:**
- Modify: `src/modules/auth/service.ts`
- Modify: `src/modules/auth/views.tsx`
- Modify: `src/modules/auth/routes.tsx`
- Modify: `src/app.tsx`
- Test: `test/auth.unit.test.ts`
- Test: `test/auth.integration.test.ts`

**Interfaces:**
- `normalizeRegistration(form)` rejects mismatched `password`/`password_confirmation`.
- Add `GET /dashboard/member/profile` and `POST /dashboard/member/profile`, both resolved exclusively from JWT `sub`.

- [ ] **Step 1: Write failing password/profile tests**

```ts
test("registration rejects mismatched password confirmation", async () => {
  const form = new FormData();
  form.set("email", "a@example.com"); form.set("password", "one"); form.set("password_confirmation", "two");
  expect((await app.request("/auth/register", { method: "POST", body: form })).status).toBe(400);
});

test("profile update cannot modify another user", async () => {
  const response = await app.request("/dashboard/member/profile", { method: "POST", headers: { cookie }, body: profileForm });
  expect(response.status).toBe(200);
  expect(otherUser.email).toBe("other@example.com");
});
```

- [ ] **Step 2: Run to verify failures**

Run: `bun test test/auth.unit.test.ts test/auth.integration.test.ts`

Expected: FAIL because confirmation and profile routes are missing.

- [ ] **Step 3: Implement minimal server-validated forms**

Add confirmation input to `Register`; validate equality before hashing. Add a profile page linked from the dashboard avatar menu; update only `username`, `phone`, `first_name`, `last_name`, and optionally password after matching `password_confirmation`. Use a JSX form and HTMX result target; never accept `user_id` from the form.

- [ ] **Step 4: Verify tests**

Run: `bun test test/auth.unit.test.ts test/auth.integration.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth src/app.tsx test/auth.unit.test.ts test/auth.integration.test.ts
git commit -m "feat: add password confirmation and profile editing"
```

### Task 3: Shared admin controls, role titles, and working toasts

**Files:**
- Modify: `src/modules/admin/views.tsx`
- Modify: `src/modules/admin/routes.tsx`
- Modify: `src/ui/layout.tsx`
- Modify: `src/lib/cache.ts`
- Test: `test/auth.integration.test.ts`

**Interfaces:**
- `CrudTable` displays `role_title` rather than `role_id`.
- `Toast` emits `hx-swap-oob="beforeend:#toast-container"` and mutations return the requested replacement plus the toast fragment.

- [ ] **Step 1: Write failing UI-response tests**

```ts
test("admin user table renders role title and mutation returns an OOB toast", async () => {
  const html = await (await app.request("/dashboard/admin/users", { headers: { cookie } })).text();
  expect(html).toContain("Super Admin");
  const created = await app.request("/dashboard/admin/tags", { method: "POST", headers: { cookie }, body: tagForm });
  expect(await created.text()).toContain('hx-swap-oob="beforeend:#toast-container"');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test test/auth.integration.test.ts`

Expected: FAIL because role title and OOB response composition are incomplete.

- [ ] **Step 3: Implement UI consistency**

Use one `modal-action justify-end` rule for every dialog. Remove the admin "Back to app" control. Query users with `JOIN roles` and render `role_title`. Ensure all admin mutations compose replacement HTML with `Toast`; use a daisyUI-compatible select, including every role/presenter/tag/attendee selector.

- [ ] **Step 4: Verify test**

Run: `bun test test/auth.integration.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/admin src/ui/layout.tsx src/lib/cache.ts test/auth.integration.test.ts
git commit -m "fix: standardize admin controls and toasts"
```

### Task 4: Meet media and relation management

**Files:**
- Modify: `src/modules/admin/routes.tsx`
- Modify: `src/modules/admin/views.tsx`
- Modify: `src/modules/landing/views.tsx`
- Test: `test/auth.integration.test.ts`

**Interfaces:**
- Meet edit includes image preview, tags, and attendees.
- `POST /dashboard/admin/meets/:id` transaction replaces `meet_tags` and `meet_attendees` from selected IDs.
- Tag badges render `tooltip` with the tag description.

- [ ] **Step 1: Write failing relation/UI tests**

```ts
test("meet edit renders selected relations and image preview", async () => {
  const html = await (await app.request(`/dashboard/admin/meets/${meetId}/edit`, { headers: { cookie } })).text();
  expect(html).toContain('name="tag_ids"');
  expect(html).toContain('name="attendee_ids"');
  expect(html).toContain('alt="Meet image preview"');
});

test("editing a meet replaces tag and attendee mappings", async () => {
  await app.request(`/dashboard/admin/meets/${meetId}`, { method: "POST", headers: { cookie }, body: editForm });
  expect(tagIdsForMeet(meetId)).toEqual([newTagId]);
  expect(attendeeIdsForMeet(meetId)).toEqual([newUserId]);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test test/auth.integration.test.ts`

Expected: FAIL because preview and mapping persistence are not fully covered.

- [ ] **Step 3: Implement relation UI and display**

Use transactionally replaced junction rows for tags/attendees. Add explicit small delete buttons next to existing mappings in the edit modal if desired; their HTMX endpoint removes one mapping and returns the relation list. Render an `img` preview only for non-empty `image_url`. Add `tooltip`/`data-tip` around landing tag badges only when descriptions are non-empty.

- [ ] **Step 4: Verify test**

Run: `bun test test/auth.integration.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/admin src/modules/landing test/auth.integration.test.ts
git commit -m "feat: manage meet relations and media"
```

### Task 5: Role endpoint mapping management

**Files:**
- Modify: `src/modules/admin/routes.tsx`
- Modify: `src/modules/admin/views.tsx`
- Test: `test/auth.integration.test.ts`

**Interfaces:**
- Add `GET/POST/PATCH/DELETE /dashboard/admin/roles/:roleId/endpoints/:endpointId`.
- Reject all mutation routes where the role title is `Super Admin`.

- [ ] **Step 1: Write failing mapping tests**

```ts
test("role endpoint mapping can be added and removed", async () => {
  expect((await app.request(`/dashboard/admin/roles/${memberRoleId}/endpoints/${endpointId}`, { method: "POST", headers: { cookie } })).status).toBe(200);
  expect(mappingExists(memberRoleId, endpointId)).toBe(true);
  await app.request(`/dashboard/admin/roles/${memberRoleId}/endpoints/${endpointId}`, { method: "DELETE", headers: { cookie } });
  expect(mappingExists(memberRoleId, endpointId)).toBe(false);
});

test("Super Admin mappings cannot be changed", async () => {
  expect((await app.request(`/dashboard/admin/roles/${superAdminRoleId}/endpoints/${endpointId}`, { method: "DELETE", headers: { cookie } })).status).toBe(403);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test test/auth.integration.test.ts`

Expected: FAIL because mapping CRUD routes are incomplete.

- [ ] **Step 3: Implement mapping CRUD**

Show existing mappings under role edit, add from valid endpoint select, allow description update, and use a daisyUI confirmation dialog for deletion. Validate both role and endpoint are active rows. Call `clearPermissionCache(roleId)` after any successful non-Super-Admin mapping mutation.

- [ ] **Step 4: Verify test**

Run: `bun test test/auth.integration.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/admin test/auth.integration.test.ts
git commit -m "feat: manage role endpoint mappings"
```

### Task 6: Secure schema-report page and endpoint audit

**Files:**
- Create: `src/modules/admin/report.ts`
- Modify: `src/modules/admin/routes.tsx`
- Modify: `src/modules/admin/views.tsx`
- Modify: `src/modules/auth/database.ts`
- Modify: `src/modules/auth/middleware.tsx`
- Test: `test/auth.unit.test.ts`
- Test: `test/auth.integration.test.ts`

**Interfaces:**
- `validateReportSql(sql: string): string | null` returns a normalized allowed query or an error string.
- `GET /dashboard/admin/report` and `POST /dashboard/admin/report` require exact `Super Admin` role title and `/dashboard/admin/report` endpoint permission.

- [ ] **Step 1: Write failing validator and integration tests**

```ts
test("report validator permits one read query and rejects writes", () => {
  expect(validateReportSql("SELECT id FROM users")).toBe("SELECT id FROM users");
  expect(validateReportSql("SELECT 1; DELETE FROM users")).toContain("single");
  expect(validateReportSql("UPDATE users SET email='x'")).toContain("read-only");
});

test("report endpoint is Super-Admin-only", async () => {
  expect((await app.request("/dashboard/admin/report", { headers: { cookieForMember } })).status).toBe(403);
  expect((await app.request("/dashboard/admin/report", { headers: { cookieForSuperAdmin } })).status).toBe(200);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test test/auth.unit.test.ts test/auth.integration.test.ts`

Expected: FAIL because the validator and report routes do not exist.

- [ ] **Step 3: Implement restricted reporting**

Seed `/dashboard/admin/report` and map it only to Super Admin. Implement a validator that rejects empty input, comments, semicolons except an optional final one, and case-insensitive `INSERT|UPDATE|DELETE|REPLACE|CREATE|ALTER|DROP|PRAGMA|ATTACH|DETACH|VACUUM|BEGIN|COMMIT|ROLLBACK`; require `SELECT` or `WITH`. Execute `SELECT * FROM (<query>) LIMIT 200` and render generic column/row results with schema `PRAGMA table_info` metadata. Return a warning toast for rejected SQL.

- [ ] **Step 4: Audit every protected endpoint**

Check every `app.get`, `app.post`, `app.patch`, and `app.delete` below `/dashboard` has verified session, exact role path handling, or `createPermissionChecker` coverage. Add test requests for unauthenticated, member, and Super Admin cases on profile, admin CRUD, mappings, and reports.

- [ ] **Step 5: Verify full suite and commit**

Run: `bunx tsc --noEmit && bun test && git diff --check`

Expected: PASS.

```bash
git add src/modules/admin src/modules/auth test/auth.unit.test.ts test/auth.integration.test.ts
git commit -m "feat: add secure admin sql reports"
```
