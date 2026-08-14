# Production Admin Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a polished Cobra Decision admin console with dependable toasts, readable SQL reports, searchable/sortable resource tables, and dedicated meet relationship controls.

**Architecture:** Retain the existing Hono/HTMX paths but split table querying, mutation response composition, report rendering, and relationship controls into focused admin modules. Every table query uses a resource-owned allowlist for SQL identifiers; request values are parameters only.

**Tech Stack:** Bun, TypeScript, Hono JSX, `bun:sqlite`, HTMX, Tailwind CSS, daisyUI, Alpine.js.

## Global Constraints

- No new dependencies, React, ORM, browser alerts, or freeform SQL writes.
- Preserve all current public paths and RBAC checks.
- All table sort/filter identifiers must come from fixed server allowlists.
- All mutation success/error responses must retain the target and emit exactly one OOB toast.
- Super Admin and its endpoint mappings remain immutable.

---

### Task 1: Reliable toast response contract

**Files:**
- Modify: `src/ui/layout.tsx`
- Modify: `src/modules/admin/views.tsx`
- Create: `src/modules/admin/responses.tsx`
- Modify: `src/modules/admin/routes.tsx`
- Test: `test/auth.integration.test.ts`

**Interfaces:**
- `adminResponse(target: Child, toast: ToastMessage): JSX.Element` returns target markup plus an OOB toast.
- `toastResponse(message: ToastMessage): JSX.Element` returns a toast only.

- [ ] **Step 1: Write failing response-shape tests**

```ts
test("admin errors and mutations include one OOB toast", async () => {
  const response = await app.request("/dashboard/admin/tags", { method: "POST", headers: { cookie }, body: invalidForm });
  const html = await response.text();
  expect(html).toContain('id="toast-container"');
  expect(html.match(/hx-swap-oob/g)?.length).toBe(1);
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test test/auth.integration.test.ts`

Expected: FAIL because failures do not consistently return OOB toast markup.

- [ ] **Step 3: Implement the contract**

Create a response helper that composes replacement markup and `Toast`. Add a small `htmx:afterSwap` listener in `Layout` that removes success/info alerts after 4 seconds and adds a close button to each toast. Update every admin mutation/report error to use the helper.

- [ ] **Step 4: Verify focused test**

Run: `bun test test/auth.integration.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/layout.tsx src/modules/admin test/auth.integration.test.ts
git commit -m "fix: make admin toast responses reliable"
```

### Task 2: Readable schema report and robust report errors

**Files:**
- Modify: `src/modules/admin/report.ts`
- Create: `src/modules/admin/report-views.tsx`
- Modify: `src/modules/admin/routes.tsx`
- Test: `test/auth.unit.test.ts`
- Test: `test/auth.integration.test.ts`

**Interfaces:**
- `getSchemaRows(db): SchemaRow[]` returns table, column, type, nullability, default, and primary-key metadata from `pragma_table_info`.
- `ReportPage` renders schema as a readable daisyUI table.

- [ ] **Step 1: Write failing report UI/error tests**

```ts
test("report page renders schema rows as a table", async () => {
  const html = await (await app.request("/dashboard/admin/report", { headers: { cookie } })).text();
  expect(html).toContain("Table");
  expect(html).toContain("Column");
  expect(html).toContain("users");
});

test("invalid report query emits a visible OOB error toast", async () => {
  const response = await app.request("/dashboard/admin/report", { method: "POST", headers: { cookie }, body: sqlForm("DELETE FROM users") });
  expect(await response.text()).toContain('alert-error');
});
```

- [ ] **Step 2: Run to verify failures**

Run: `bun test test/auth.unit.test.ts test/auth.integration.test.ts`

Expected: FAIL because schema is rendered as raw DDL and errors target only the result node.

- [ ] **Step 3: Implement schema-table report views**

Read each application table’s `pragma_table_info` rows and render grouped daisyUI tables. Keep DDL unavailable in UI. Route all validator/execution errors through Task 1’s response helper while retaining `#report-result`.

- [ ] **Step 4: Verify tests**

Run: `bun test test/auth.unit.test.ts test/auth.integration.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/admin test/auth.unit.test.ts test/auth.integration.test.ts
git commit -m "feat: improve readable sql reports"
```

### Task 3: Resource queries with search, filters, and sorting

**Files:**
- Create: `src/modules/admin/resources.ts`
- Modify: `src/modules/admin/routes.tsx`
- Modify: `src/modules/admin/views.tsx`
- Test: `test/auth.integration.test.ts`

**Interfaces:**
- `getResourceRows(db, resource, options): Row[]` accepts `q`, `sort`, `direction`, and fixed resource-specific filters.
- `resourceConfig` owns allowed columns, labels, searchable fields, filter fields, and table joins.

- [ ] **Step 1: Write failing query tests**

```ts
test("users table supports search and safe sorting", async () => {
  const html = await (await app.request("/dashboard/admin/users?q=maya&sort=email&direction=asc", { headers: { cookie } })).text();
  expect(html).toContain("maya@example.com");
  expect(html).not.toContain("noah@example.com");
});

test("unsafe sort identifier falls back to resource default", async () => {
  const response = await app.request("/dashboard/admin/users?sort=email;DELETE", { headers: { cookie } });
  expect(response.status).toBe(200);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test test/auth.integration.test.ts`

Expected: FAIL because tables ignore query controls.

- [ ] **Step 3: Implement allowlisted table querying and product controls**

Use per-resource configs to generate the SQL select/from/order expression. Bind `q` and filter values as parameters. Render a compact search input, sort links, and select filters; HTMX updates only the table panel. Add a clear empty-state card for zero matches.

- [ ] **Step 4: Verify tests**

Run: `bun test test/auth.integration.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/admin test/auth.integration.test.ts
git commit -m "feat: add admin table search and sorting"
```

### Task 4: Dedicated meet relationships and mature table UX

**Files:**
- Create: `src/modules/admin/meet-relations.tsx`
- Modify: `src/modules/admin/routes.tsx`
- Modify: `src/modules/admin/views.tsx`
- Modify: `src/modules/landing/views.tsx`
- Test: `test/auth.integration.test.ts`

**Interfaces:**
- `MeetRelations` renders current tags/attendees, searchable add controls, and mapping-delete buttons.
- Existing `POST /dashboard/admin/meets/:id` remains a full replacement save; relation endpoints update an individual relation panel.

- [ ] **Step 1: Write failing relation panel tests**

```ts
test("meet edit includes separately manageable tag and attendee sections", async () => {
  const html = await (await app.request(`/dashboard/admin/meets/${meetId}/edit`, { headers: { cookie } })).text();
  expect(html).toContain("Meet tags");
  expect(html).toContain("Meet attendees");
  expect(html).toContain(`/dashboard/admin/meets/${meetId}/tags`);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test test/auth.integration.test.ts`

Expected: FAIL because relations are only multi-select fields.

- [ ] **Step 3: Implement relationship panels and improved presentation**

Render current mappings as removable chips/list rows. Add styled searchable select controls for adding one tag/attendee and individual delete endpoints that validate the parent and active foreign row. Keep image preview small, use `object-cover`, and show tag descriptions through daisyUI tooltips on landing cards.

- [ ] **Step 4: Verify tests**

Run: `bun test test/auth.integration.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/admin src/modules/landing test/auth.integration.test.ts
git commit -m "feat: add dedicated meet relation controls"
```

### Task 5: Production audit and visual polish

**Files:**
- Modify: `src/modules/admin/routes.tsx`
- Modify: `src/modules/admin/views.tsx`
- Modify: `src/modules/auth/routes.tsx`
- Modify: `src/modules/auth/views.tsx`
- Modify: `src/app.tsx`
- Test: `test/auth.integration.test.ts`
- Test: `test/app.test.tsx`

**Interfaces:**
- No public-path change; every `/dashboard/**` route requires verified JWT and current user/role lookup.

- [ ] **Step 1: Write failing endpoint-matrix tests**

```ts
test("members cannot call admin mutation routes", async () => {
  expect((await app.request("/dashboard/admin/tags", { method: "POST", headers: { cookie: memberCookie }, body: tagForm })).status).toBe(403);
});

test("admin pages include responsive product controls", async () => {
  const html = await (await app.request("/dashboard/admin/users", { headers: { cookie } })).text();
  expect(html).toContain("max-w-7xl");
  expect(html).toContain("overflow-x-auto");
});
```

- [ ] **Step 2: Run to verify failures**

Run: `bun test test/auth.integration.test.ts test/app.test.tsx`

Expected: FAIL for missing matrix/polish coverage.

- [ ] **Step 3: Audit and refactor**

Audit every auth/dashboard/admin route for auth, role, deleted-record, and foreign-key validation. Ensure all forms have labels, keyboard-safe dialog controls, and bottom-right actions. Apply consistent product spacing, status feedback, hover/focus states, mobile overflow behavior, and empty states. Rebuild `public/app.css`.

- [ ] **Step 4: Verify full suite**

Run: `bun run build:css && bunx tsc --noEmit && bun test && git diff --check`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src public/app.css test
git commit -m "refactor: harden and polish admin console"
```
