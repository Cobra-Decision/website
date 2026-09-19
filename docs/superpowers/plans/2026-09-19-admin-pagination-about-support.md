# Admin Pagination, About Us, and Support Us Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement server-side pagination (10 items/page) for all administrative management tables, and build dedicated bilingual "About Us" (`/about`) and "Support Us" (`/support`) pages with embedded Yavar crowdfunding widget and landing navigation links.

**Architecture:** 
- A unified server-side pagination module (`src/modules/admin/pagination.ts`) calculates offsets and generates preserved query strings for HTMX outerHTML swaps.
- Administrative resource queries (`users`, `meets`, `tags`, `roles`, `endpoints`, and `files`) query matching total counts and slice records using `LIMIT ? OFFSET ?`.
- Landing routes (`/about`, `/support`, and `/donate` redirect) render server-side JSX views styled with Tailwind CSS, daisyUI, Vazirmatn typography, and dark-theme iframe embeds.

**Tech Stack:** Bun, Hono, JSX, HTMX, SQLite (WAL mode), Tailwind CSS + daisyUI, Vazirmatn (RTL).

**Spec:** `docs/superpowers/specs/2026-09-19-admin-pagination-about-support-design.md`

## Global Constraints

- Default page size across all admin management tables is `10` records.
- Query parameters `page`, `limit`, `q`, `search_field`, `sort`, and `direction` must be preserved during page navigation.
- All Persian content must support RTL layout with `Vazirmatn` font and logical spacing (`ps-*`, `pe-*`, `ms-*`, `me-*`).
- The Support Us page must embed the Yavar donation iframe with exact attributes:
  `<iframe src="https://donate.sudoshz.ir/embed/widget.php?slug=cobra-decision&theme=dark&lang=fa" title="حمایت با یاور" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" style="width:100%;max-width:420px;height:280px;border:0;border-radius:16px;overflow:hidden;display:block;margin:0 auto" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>`

---

### Task 1: Admin Pagination Core Calculation & Parameter Helpers (TDD)

**Files:**
- Create: `src/modules/admin/pagination.ts`
- Test: `src/modules/admin/pagination.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface PaginationState {
    page: number;
    limit: number;
    offset: number;
    totalPages: number;
    totalCount: number;
    hasPrev: boolean;
    hasNext: boolean;
  }
  export function parsePaginationParams(query: Record<string, string | undefined>, defaultLimit?: number): { page: number; limit: number; offset: number };
  export function calculatePagination(totalCount: number, page: number, limit: number): PaginationState;
  export function buildPaginationUrl(baseUrl: string, page: number, query: Record<string, string | undefined>): string;
  ```

- [ ] **Step 1: Write failing unit tests for pagination calculations**

Create `src/modules/admin/pagination.test.ts`:
```ts
import { describe, expect, it } from "bun:test";
import { calculatePagination, parsePaginationParams, buildPaginationUrl } from "./pagination";

describe("Admin Pagination Helper", () => {
  it("parses query parameters with safe defaults", () => {
    expect(parsePaginationParams({})).toEqual({ page: 1, limit: 10, offset: 0 });
    expect(parsePaginationParams({ page: "3", limit: "10" })).toEqual({ page: 3, limit: 10, offset: 20 });
    expect(parsePaginationParams({ page: "-5", limit: "0" })).toEqual({ page: 1, limit: 10, offset: 0 });
    expect(parsePaginationParams({ page: "invalid" })).toEqual({ page: 1, limit: 10, offset: 0 });
  });

  it("calculates pagination state correctly", () => {
    const state = calculatePagination(35, 2, 10);
    expect(state).toEqual({
      page: 2,
      limit: 10,
      offset: 10,
      totalPages: 4,
      totalCount: 35,
      hasPrev: true,
      hasNext: true,
    });
  });

  it("handles empty and boundary counts", () => {
    const empty = calculatePagination(0, 1, 10);
    expect(empty.totalPages).toBe(1);
    expect(empty.hasPrev).toBe(false);
    expect(empty.hasNext).toBe(false);

    const firstPage = calculatePagination(10, 1, 10);
    expect(firstPage.totalPages).toBe(1);
    expect(firstPage.hasPrev).toBe(false);
    expect(firstPage.hasNext).toBe(false);
  });

  it("builds URL preserving existing query parameters", () => {
    const url = buildPaginationUrl("/dashboard/admin/users", 3, {
      q: "ali",
      search_field: "email",
      sort: "created_at",
      direction: "desc",
    });
    expect(url).toContain("/dashboard/admin/users?");
    expect(url).toContain("page=3");
    expect(url).toContain("q=ali");
    expect(url).toContain("search_field=email");
    expect(url).toContain("sort=created_at");
    expect(url).toContain("direction=desc");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/modules/admin/pagination.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement pagination helpers in `src/modules/admin/pagination.ts`**

```ts
export interface PaginationState {
  page: number;
  limit: number;
  offset: number;
  totalPages: number;
  totalCount: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export function parsePaginationParams(
  query: Record<string, string | undefined> = {},
  defaultLimit = 10
): { page: number; limit: number; offset: number } {
  const rawPage = Number.parseInt(String(query.page ?? "1"), 10);
  const rawLimit = Number.parseInt(String(query.limit ?? defaultLimit), 10);

  const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit = Number.isNaN(rawLimit) || rawLimit < 1 ? defaultLimit : Math.min(rawLimit, 100);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function calculatePagination(totalCount: number, page: number, limit: number): PaginationState {
  const safeTotal = Math.max(0, totalCount);
  const totalPages = Math.max(1, Math.ceil(safeTotal / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * limit;

  return {
    page: safePage,
    limit,
    offset,
    totalPages,
    totalCount: safeTotal,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
  };
}

export function buildPaginationUrl(
  baseUrl: string,
  page: number,
  query: Record<string, string | undefined> = {}
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "" && key !== "page") {
      params.set(key, value);
    }
  }
  params.set("page", String(page));
  return `${baseUrl}?${params.toString()}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/modules/admin/pagination.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/admin/pagination.ts src/modules/admin/pagination.test.ts
git commit -m "feat(admin): add pagination core helper functions and test suite"
```

---

### Task 2: Reusable Admin Pagination UI Component

**Files:**
- Create: `src/modules/admin/pagination-view.tsx`
- Modify: `src/modules/admin/views.tsx`

**Interfaces:**
- Consumes: `PaginationState`, `buildPaginationUrl` from `src/modules/admin/pagination.ts`
- Produces: `<Pagination />` JSX component

- [ ] **Step 1: Create `src/modules/admin/pagination-view.tsx`**

```tsx
import type { Locale } from "../../lib/i18n/translations";
import { t, formatLocalizedNumber } from "../../lib/i18n/context";
import { buildPaginationUrl, type PaginationState } from "./pagination";

export interface PaginationProps {
  state: PaginationState;
  resource: string;
  baseUrl: string;
  targetId: string;
  query?: Record<string, string | undefined>;
  locale?: Locale;
}

export function Pagination({
  state,
  resource,
  baseUrl,
  targetId,
  query = {},
  locale = "en",
}: PaginationProps) {
  const { page, totalPages, totalCount, limit, hasPrev, hasNext } = state;
  if (totalCount === 0) return null;

  const startEntry = (page - 1) * limit + 1;
  const endEntry = Math.min(page * limit, totalCount);

  // Generate visible page numbers (e.g. 1, 2, 3 ... with current in center)
  const delta = 2;
  const range: number[] = [];
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    range.push(i);
  }

  const prevUrl = buildPaginationUrl(baseUrl, page - 1, query);
  const nextUrl = buildPaginationUrl(baseUrl, page + 1, query);
  const firstUrl = buildPaginationUrl(baseUrl, 1, query);
  const lastUrl = buildPaginationUrl(baseUrl, totalPages, query);

  return (
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-base-200">
      <div class="text-xs text-base-content/70">
        {locale === "fa" ? (
          <>
            نمایش{" "}
            <span class="font-semibold text-base-content font-mono">{formatLocalizedNumber(startEntry, locale)}</span> تا{" "}
            <span class="font-semibold text-base-content font-mono">{formatLocalizedNumber(endEntry, locale)}</span> از{" "}
            <span class="font-semibold text-base-content font-mono">{formatLocalizedNumber(totalCount, locale)}</span> مورد
          </>
        ) : (
          <>
            Showing{" "}
            <span class="font-semibold text-base-content font-mono">{startEntry}</span> to{" "}
            <span class="font-semibold text-base-content font-mono">{endEntry}</span> of{" "}
            <span class="font-semibold text-base-content font-mono">{totalCount}</span> entries
          </>
        )}
      </div>

      <div class="join shadow-sm border border-base-300">
        {/* First & Prev */}
        <button
          type="button"
          class={`join-item btn btn-sm ${!hasPrev ? "btn-disabled opacity-50" : ""}`}
          hx-get={hasPrev ? prevUrl : undefined}
          hx-target={`#${targetId}`}
          hx-swap="outerHTML"
          disabled={!hasPrev}
          aria-label="Previous Page"
        >
          {locale === "fa" ? "قبلی" : "Prev"}
        </button>

        {range[0] > 1 && (
          <>
            <button
              type="button"
              class={`join-item btn btn-sm ${page === 1 ? "btn-active font-bold" : ""}`}
              hx-get={firstUrl}
              hx-target={`#${targetId}`}
              hx-swap="outerHTML"
            >
              {formatLocalizedNumber(1, locale)}
            </button>
            {range[0] > 2 && <button type="button" class="join-item btn btn-sm btn-disabled">...</button>}
          </>
        )}

        {range.map((p) => (
          <button
            key={p}
            type="button"
            class={`join-item btn btn-sm ${page === p ? "btn-active btn-primary font-bold" : ""}`}
            hx-get={buildPaginationUrl(baseUrl, p, query)}
            hx-target={`#${targetId}`}
            hx-swap="outerHTML"
          >
            {formatLocalizedNumber(p, locale)}
          </button>
        ))}

        {range[range.length - 1] < totalPages && (
          <>
            {range[range.length - 1] < totalPages - 1 && <button type="button" class="join-item btn btn-sm btn-disabled">...</button>}
            <button
              type="button"
              class={`join-item btn btn-sm ${page === totalPages ? "btn-active font-bold" : ""}`}
              hx-get={lastUrl}
              hx-target={`#${targetId}`}
              hx-swap="outerHTML"
            >
              {formatLocalizedNumber(totalPages, locale)}
            </button>
          </>
        )}

        {/* Next */}
        <button
          type="button"
          class={`join-item btn btn-sm ${!hasNext ? "btn-disabled opacity-50" : ""}`}
          hx-get={hasNext ? nextUrl : undefined}
          hx-target={`#${targetId}`}
          hx-swap="outerHTML"
          disabled={!hasNext}
          aria-label="Next Page"
        >
          {locale === "fa" ? "بعدی" : "Next"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `CrudTable` in `src/modules/admin/views.tsx` to include `pagination`**

Update `CrudTable` props and render `<Pagination />`:
```tsx
import { Pagination } from "./pagination-view";
import type { PaginationState } from "./pagination";

export function CrudTable({
  resource,
  rows,
  columns,
  searchFields = ["id"],
  query = {},
  locale = "en",
  timeZone,
  pagination,
}: {
  resource: string;
  rows: Row[];
  columns: string[];
  searchFields?: string[];
  query?: Record<string, string>;
  locale?: Locale;
  timeZone?: string;
  pagination?: PaginationState;
}) {
  // ... existing code ...
  // at bottom of CrudTable, before closing div:
  return (
    <div id={`${resource}-table`} class="space-y-6">
      {/* existing header, search form, bulk table form */}
      {/* ... */}
      {pagination && (
        <Pagination
          state={pagination}
          resource={resource}
          baseUrl={`/dashboard/admin/${resource}`}
          targetId={`${resource}-table`}
          query={query}
          locale={locale}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `bun run check`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/modules/admin/pagination-view.tsx src/modules/admin/views.tsx
git commit -m "feat(admin): add reusable Pagination component to CrudTable"
```

---

### Task 3: Paginate Admin CRUD Routes & File Management Routes

**Files:**
- Modify: `src/modules/admin/routes.tsx`
- Modify: `src/modules/admin/files/routes.tsx`
- Modify: `src/modules/admin/files/views.tsx`
- Test: `src/modules/admin/admin-pagination.test.ts`

**Interfaces:**
- Consumes: `parsePaginationParams`, `calculatePagination`
- Produces: Paginated query outputs for `/dashboard/admin/:resource` and `/dashboard/admin/files`

- [ ] **Step 1: Write integration tests for Admin Pagination in `src/modules/admin/admin-pagination.test.ts`**

```ts
import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { createAdminRoutes } from "./routes";
import { generateId } from "../../lib/id";
import { sign } from "hono/jwt";

describe("Admin Resource Pagination Integration", () => {
  const db = new Database(":memory:");
  db.run("PRAGMA foreign_keys = ON;");
  
  // Seed basic schema
  db.run(`
    CREATE TABLE roles (id TEXT PRIMARY KEY, title TEXT UNIQUE NOT NULL, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME);
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, username TEXT, phone TEXT, first_name TEXT, last_name TEXT, password_hash TEXT NOT NULL, role_id TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME, FOREIGN KEY (role_id) REFERENCES roles(id));
    CREATE TABLE meets (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, topics TEXT, scheduled_date TEXT, scheduled_time TEXT, scheduled_at_utc TEXT, duration_minutes INTEGER, meet_url TEXT, video_url TEXT, file_url TEXT, image_url TEXT, status TEXT DEFAULT 'upcoming', publish_status TEXT DEFAULT 'public', access_status TEXT DEFAULT 'public', presenter_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME);
    CREATE TABLE tags (id TEXT PRIMARY KEY, title TEXT UNIQUE NOT NULL, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME);
    CREATE TABLE endpoints (id TEXT PRIMARY KEY, title TEXT UNIQUE NOT NULL, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME);
    CREATE TABLE meet_tags (meet_id TEXT NOT NULL, tag_id TEXT NOT NULL, PRIMARY KEY(meet_id, tag_id));
    CREATE TABLE meet_attendees (meet_id TEXT NOT NULL, user_id TEXT NOT NULL, PRIMARY KEY(meet_id, user_id));
    CREATE TABLE meet_allowed_users (meet_id TEXT NOT NULL, user_id TEXT NOT NULL, PRIMARY KEY(meet_id, user_id));
    CREATE TABLE role_endpoints (role_id TEXT NOT NULL, endpoint_id TEXT NOT NULL, PRIMARY KEY(role_id, endpoint_id));
    CREATE TABLE email_errors (id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME);
  `);

  const roleId = generateId();
  db.run("INSERT INTO roles (id, title) VALUES (?, 'Super Admin')", [roleId]);
  
  // Seed 25 users
  for (let i = 1; i <= 25; i++) {
    db.run(
      "INSERT INTO users (id, email, username, password_hash, role_id) VALUES (?, ?, ?, 'hash', ?)",
      [generateId(), `user${i}@example.com`, `user${i}`, roleId]
    );
  }

  const jwtSecret = "test-secret";
  const app = createAdminRoutes(db, jwtSecret);

  it("returns paginated users (first 10 items on page 1)", async () => {
    const token = await sign({ sub: "admin", role_id: roleId }, jwtSecret);
    const res = await app.request("/users?page=1&limit=10", {
      headers: { Cookie: `session=${token}` },
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Showing");
    expect(html).toContain("1 to 10 of 25");
    expect(html).toContain("page=2");
  });

  it("returns second page with remaining users", async () => {
    const token = await sign({ sub: "admin", role_id: roleId }, jwtSecret);
    const res = await app.request("/users?page=2&limit=10", {
      headers: { Cookie: `session=${token}` },
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("11 to 20 of 25");
  });
});
```

- [ ] **Step 2: Update `src/modules/admin/routes.tsx` to query counts and apply LIMIT & OFFSET**

Update `rowsFor` and route handler in `src/modules/admin/routes.tsx`:
```tsx
import { parsePaginationParams, calculatePagination, type PaginationState } from "./pagination";

// In createAdminRoutes:
const rowsFor = (
  resource: keyof typeof config,
  query: Record<string, string> = {},
  isSuperAdminUser = true,
  page = 1,
  limit = 10
) => {
  const direction = query.direction === "asc" ? "ASC" : "DESC";
  const sort = query.sort && config[resource].columns.includes(query.sort as never) ? query.sort : "id";
  const q = query.q?.trim();
  const searchField = config[resource].searchFields.includes(query.search_field as never) ? query.search_field : config[resource].searchFields[0];
  const offset = (page - 1) * limit;

  if (resource === "users") {
    const allowed = ["id", "email", "username", "phone", "first_name", "last_name", "role_title", "created_at", "updated_at"];
    const userSort = allowed.includes(sort) ? sort : "id";
    const field = searchField === "role_title" ? "r.title" : `u.${searchField}`;

    const countSql = `SELECT COUNT(*) as count FROM users u JOIN roles r ON r.id=u.role_id WHERE u.deleted_at IS NULL AND r.deleted_at IS NULL${q ? ` AND CAST(${field} AS TEXT) LIKE ?` : ""}`;
    const totalCount = (q ? db.query<{ count: number }, [string]>(countSql).get(`%${q}%`) : db.query<{ count: number }, []>(countSql).get())?.count ?? 0;

    const sql = `SELECT u.id,u.email,u.username,u.phone,u.first_name,u.last_name,r.title role_title,u.created_at,u.updated_at FROM users u JOIN roles r ON r.id=u.role_id WHERE u.deleted_at IS NULL AND r.deleted_at IS NULL${q ? ` AND CAST(${field} AS TEXT) LIKE ?` : ""} ORDER BY ${userSort === "role_title" ? "r.title" : `u.${userSort}`} ${direction} LIMIT ? OFFSET ?`;
    const rows = (q ? db.query(sql).all(`%${q}%`, limit, offset) : db.query(sql).all(limit, offset)) as Row[];

    return { rows, totalCount };
  }

  const rbacFilter = resource === "meets" && !isSuperAdminUser ? " AND publish_status != 'private'" : "";
  const countSql = `SELECT COUNT(*) as count FROM ${config[resource].table} WHERE deleted_at IS NULL${rbacFilter}${q ? ` AND CAST(${searchField} AS TEXT) LIKE ?` : ""}`;
  const totalCount = (q ? db.query<{ count: number }, [string]>(countSql).get(`%${q}%`) : db.query<{ count: number }, []>(countSql).get())?.count ?? 0;

  const sql = `SELECT ${config[resource].columns.join(", ")} FROM ${config[resource].table} WHERE deleted_at IS NULL${rbacFilter}${q ? ` AND CAST(${searchField} AS TEXT) LIKE ?` : ""} ORDER BY ${sort} ${direction} LIMIT ? OFFSET ?`;
  const rows = (q ? db.query(sql).all(`%${q}%`, limit, offset) : db.query(sql).all(limit, offset)) as Row[];

  return { rows, totalCount };
};
```

Update `app.get("/:resource")` to parse pagination and pass `pagination` state to `CrudTable`.

- [ ] **Step 3: Update `src/modules/admin/files/routes.tsx` and `src/modules/admin/files/views.tsx` for pagination**

In `src/modules/admin/files/routes.tsx`:
- Parse `parsePaginationParams(c.req.query())`.
- Filter and sort `listFiles()`.
- Calculate `calculatePagination(filteredFiles.length, page, limit)`.
- Slice `filteredFiles.slice(offset, offset + limit)`.
- Pass `pagination` to `FileGrid`.

In `src/modules/admin/files/views.tsx`:
- Render `<Pagination />` component in `FileGrid`.

- [ ] **Step 4: Run integration tests and typecheck**

Run: `bun test src/modules/admin/admin-pagination.test.ts && bun run check`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/admin/routes.tsx src/modules/admin/files/routes.tsx src/modules/admin/files/views.tsx src/modules/admin/admin-pagination.test.ts
git commit -m "feat(admin): enable server-side pagination across all admin management tables and files"
```

---

### Task 4: Translations & i18n Dictionary for About Us, Support Us, and Navigation

**Files:**
- Modify: `src/lib/i18n/translations.ts`

- [ ] **Step 1: Add new translation keys for English and Persian**

Add the following keys to `src/lib/i18n/translations.ts`:
- `nav.about`: "About Us" / "درباره ما"
- `nav.support`: "Support Us" / "حمایت مالی"
- `about.hero_quote`: `"A place for better conversations. Make room for ideas that matter."` / `"فضایی برای گفتگوهای هدفمند و سازنده؛ جایی برای ایده‌هایی که اهمیت دارند."`
- `about.hero_title`: "Engineering Conversations Without the Noise" / "فضایی برای گفتگوهای تخصصی مهندسی کامپیوتر"
- `about.hero_subtitle`: "Cobra Decision is a weekly online tech community for open developer discussions and deep-dive technical talks." / "تصمیم کبرا پلتفرم آنلاین گفتگوهای هفتگی تخصصی کامپیوتر، چالش‌های واقعی توسعه‌دهندگان و ارائه‌های عمیق فنی است."
- Core value keys: `about.values.learn_in_public`, `about.values.depth_over_hype`, `about.values.constructive_dialogue`.
- Weekly format keys: `about.formats.roundtables`, `about.formats.talks`.
- Support page keys: `support.hero_badge`, `support.hero_title`, `support.hero_subtitle`, `support.yavar_title`, `support.allocation_title`, `support.faq_title`.

- [ ] **Step 2: Run typecheck**

Run: `bun run check`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/translations.ts
git commit -m "feat(i18n): add English and Persian translations for about us, support us, and navigation"
```

---

### Task 5: Build About Us & Support Us Views & Routes

**Files:**
- Create: `src/modules/landing/about-views.tsx`
- Create: `src/modules/landing/support-views.tsx`
- Modify: `src/modules/landing/routes.tsx`
- Test: `src/modules/landing/landing.test.ts`

- [ ] **Step 1: Write integration tests in `src/modules/landing/landing.test.ts`**

```ts
import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { createLandingRoutes } from "./routes";

describe("Landing & Content Pages", () => {
  const db = new Database(":memory:");
  const app = createLandingRoutes(db);

  it("renders /about page with status 200 and SEO tags", async () => {
    const res = await app.request("/about");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("About Cobra Decision");
    expect(html).toContain("Mission");
    expect(html).toContain("Weekly Community Roundtables");
  });

  it("renders /about page in Persian when requested", async () => {
    const res = await app.request("/about?lang=fa");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("درباره تصمیم کبرا");
    expect(html).toContain("فضایی برای گفتگوهای هدفمند");
  });

  it("renders /support page with Yavar iframe embed", async () => {
    const res = await app.request("/support");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("donate.sudoshz.ir");
    expect(html).toContain("cobra-decision");
  });

  it("redirects /donate to /support", async () => {
    const res = await app.request("/donate");
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/support");
  });
});
```

- [ ] **Step 2: Create `src/modules/landing/about-views.tsx`**

Build the comprehensive, responsive About Us view containing:
- Hero with Quote Badge
- Overview (EN & FA text adapted to locale with bilingual preview toggle)
- Mission, Vision & Core Values matrix
- Weekly Formats comparison cards
- Key Tracks & Topic domains badge grid
- Verified Metrics counter
- Community conversion action hub & verified official channels

- [ ] **Step 3: Create `src/modules/landing/support-views.tsx`**

Build the Support Us view containing:
- Hero explaining non-profit & independent developer community
- Embedded Yavar donation iframe container
- Transparent fund allocation breakdown cards (50% Server/Edge, 30% Video/Archive, 15% Domain/Bot Tools, 5% Community)
- Shiraz LUG partnership & escrow explanation
- FAQ Accordion with accessible `<details>` and `<summary>` tags

- [ ] **Step 4: Register `/about`, `/support`, and `/donate` in `src/modules/landing/routes.tsx`**

```tsx
app.get("/about", (c) => {
  const locale = getLocale(c);
  const origin = new URL("/", c.req.url).origin;
  return c.html(
    <Document
      title={locale === "fa" ? "درباره تصمیم کبرا | CobraDecision" : "About Cobra Decision"}
      description={t("about.hero_subtitle", locale)}
      canonicalUrl={`${origin}/about`}
      locale={locale}
    >
      <AboutView locale={locale} stats={getLandingCache()} />
    </Document>
  );
});

app.get("/support", (c) => {
  const locale = getLocale(c);
  const origin = new URL("/", c.req.url).origin;
  return c.html(
    <Document
      title={locale === "fa" ? "حمایت مالی از تصمیم کبرا | CobraDecision" : "Support Cobra Decision"}
      description={t("support.hero_subtitle", locale)}
      canonicalUrl={`${origin}/support`}
      locale={locale}
    >
      <SupportView locale={locale} />
    </Document>
  );
});

app.get("/donate", (c) => c.redirect("/support"));
```

- [ ] **Step 5: Run tests and verify**

Run: `bun test src/modules/landing/landing.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/landing/about-views.tsx src/modules/landing/support-views.tsx src/modules/landing/routes.tsx src/modules/landing/landing.test.ts
git commit -m "feat(landing): implement About Us and Support Us pages with Yavar donation widget"
```

---

### Task 6: Navbar & Footer Navigation Integration & End-to-End Verification

**Files:**
- Modify: `src/modules/landing/views.tsx`
- Run: Full test suite and type checking

- [ ] **Step 1: Update Navbar and Footer links in `src/modules/landing/views.tsx`**

In `Landing` header navbar:
- Add `<a class="link-hover" href="/about">{t("nav.about", locale)}</a>`
- Add `<a class="link-hover" href="/support">{t("nav.support", locale)}</a>`

In `Landing` footer:
- Add links to `/about` and `/support` under navigation.

- [ ] **Step 2: Run complete test suite and type check**

Run:
```bash
bun run check
bun test
```
Expected: 0 type errors, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/modules/landing/views.tsx
git commit -m "feat(landing): add About Us and Support Us links to landing header and footer"
```

---
