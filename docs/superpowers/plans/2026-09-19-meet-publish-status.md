# Meeting Publish Status & User Restrictions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 3-tier meeting publish statuses (`public`, `private`, `restricted`) with `meet_allowed_users` assignment in the admin meeting form dialog and comprehensive visibility filtering across the application.

**Architecture:** Add `meet_publish_status_types` lookup table, alter `meets` to include `publish_status`, backfill from existing `access_status`, and add `meet_allowed_users` join table. Update TypeScript types, queries, and auth/visibility logic. Update the admin meeting modal dialog with an Alpine.js user selection list for `restricted` meetings, protect routes (`/meets/:id`, attend/leave RSVP endpoints, `/sitemap.xml`, mailer cron, landing cache), update badges/views, and verify with automated tests.

**Tech Stack:** Bun, Hono, SQLite (WAL), JSX, Alpine.js, Tailwind CSS + daisyUI.

**Spec:** `docs/superpowers/specs/2026-09-19-meet-publish-status-design.md`

## Global Constraints
- SQLite foreign keys enabled (`PRAGMA foreign_keys = ON`).
- Pure parameterized queries for all database operations.
- Persian & English i18n support.
- Zero breaking changes to existing public meets.

---

### Task 1: Database Migration & Schema Updates

**Files:**
- Modify: `src/lib/database/migration.ts`
- Modify: `src/lib/schema.sql`
- Modify: `src/modules/events/schema.sql`
- Modify: `src/lib/database/seeding.ts`
- Modify: `src/lib/seed.ts`

**Interfaces:**
- Produces: Migration step 12 (`012_meet_publish_status_and_allowed_users`), tables `meet_publish_status_types` and `meet_allowed_users`, `meets.publish_status` column.

- [ ] **Step 1: Write Migration 012 in `src/lib/database/migration.ts`**
Add Migration 012 to `migrations` array:
```typescript
  {
    version: 12,
    name: "012_meet_publish_status_and_allowed_users",
    up: (db: Database) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS meet_publish_status_types (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL UNIQUE,
          description TEXT NOT NULL DEFAULT '',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME
        );
      `);

      const statuses = [
        { id: "public", title: "Public", description: "Visible to all visitors" },
        { id: "private", title: "Private", description: "Visible only to Super Admins" },
        { id: "restricted", title: "Restricted", description: "Visible only to assigned users and Super Admins" },
      ];
      for (const s of statuses) {
        db.run(
          "INSERT OR IGNORE INTO meet_publish_status_types (id, title, description) VALUES (?, ?, ?)",
          [s.id, s.title, s.description]
        );
      }

      const meetsCols = db.query<{ name: string }, []>("PRAGMA table_info(meets)").all();
      if (!meetsCols.some((c) => c.name === "publish_status")) {
        db.run("ALTER TABLE meets ADD COLUMN publish_status TEXT NOT NULL DEFAULT 'public' REFERENCES meet_publish_status_types(id)");
        // Backfill existing private meets
        db.run("UPDATE meets SET publish_status = 'private' WHERE access_status = 'private'");
      }

      db.run(`
        CREATE TABLE IF NOT EXISTS meet_allowed_users (
          meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (meet_id, user_id)
        );
      `);
      db.run("CREATE INDEX IF NOT EXISTS idx_meet_allowed_users_user ON meet_allowed_users(user_id);");
      db.run("CREATE INDEX IF NOT EXISTS idx_meets_publish_status ON meets(publish_status);");
    },
  },
```

- [ ] **Step 2: Update `src/lib/schema.sql` and `src/modules/events/schema.sql`**
Add `meet_publish_status_types` before `meets`, update `meets` with `publish_status TEXT NOT NULL DEFAULT 'public' REFERENCES meet_publish_status_types(id)`, and add `meet_allowed_users`.

- [ ] **Step 3: Update `src/lib/database/seeding.ts` and `src/lib/seed.ts`**
Seed `meet_publish_status_types` records on setup.

- [ ] **Step 4: Run migrations via `bun run migrate` to verify**
Run: `bun run migrate`
Expected: Migration 12 applied successfully.

- [ ] **Step 5: Commit**
```bash
git add src/lib/database/migration.ts src/lib/schema.sql src/modules/events/schema.sql src/lib/database/seeding.ts src/lib/seed.ts
git commit -m "feat(db): add meet_publish_status_types and meet_allowed_users migration 012"
```

---

### Task 2: Events Types, Queries & Leak Prevention

**Files:**
- Modify: `src/modules/events/types.ts`
- Modify: `src/modules/events/queries.ts`
- Modify: `src/modules/seo/routes.ts`
- Modify: `src/modules/mailer/service.ts`
- Modify: `src/lib/cache.ts`

**Interfaces:**
- Consumes: `meets.publish_status`, `meet_allowed_users`
- Produces: `MeetPublishStatus`, `Meet.publish_status`, `MeetWithDetails.allowed_user_ids`, updated `createMeet`, `filterMeets`, `getUpcomingMeets`, `getMeetById` taking viewer context.

- [ ] **Step 1: Update `src/modules/events/types.ts`**
Add `MeetPublishStatus = "public" | "private" | "restricted"`, update `Meet`, `MeetWithDetails`, and `CreateMeetInput`.

- [ ] **Step 2: Update `src/modules/events/queries.ts`**
Update:
1. `createMeet`: insert `publish_status`, map `meet_allowed_users` transactionally.
2. `hydrateMeets`: hydrate `allowed_user_ids` from `meet_allowed_users`.
3. `getUpcomingMeets` and `filterMeets`: support optional `viewer?: { userId?: string; isSuperAdmin?: boolean }` parameter.
   - If `viewer?.isSuperAdmin`: return all.
   - If `viewer?.userId`:
     `sql += " AND (m.publish_status = 'public' OR (m.publish_status = 'restricted' AND (m.presenter_id = ? OR EXISTS (SELECT 1 FROM meet_allowed_users mau WHERE mau.meet_id = m.id AND mau.user_id = ?))))"`
     and push `viewer.userId` twice into `args`.
   - If anonymous (no `viewer?.userId`): `sql += " AND m.publish_status = 'public'"`.
4. `getMeetById`: accept `viewer?: { userId?: string; isSuperAdmin?: boolean }` and return `null` if unauthorized.

- [ ] **Step 3: Update SEO, Mailer & Cache**
1. `src/modules/seo/routes.ts`: In `/sitemap.xml`, filter query to `WHERE publish_status = 'public' AND status != 'cancelled' AND deleted_at IS NULL`.
2. `src/modules/mailer/service.ts`: In `sendFavoriteTagMeetReminders`, filter query to `WHERE m.status = 'upcoming' AND m.publish_status = 'public' AND m.deleted_at IS NULL`.
3. `src/lib/cache.ts`: Filter count and total duration queries to `WHERE publish_status = 'public' AND deleted_at IS NULL`, and pass public viewer context to `getUpcomingMeets`.

- [ ] **Step 4: Commit**
```bash
git add src/modules/events/types.ts src/modules/events/queries.ts src/modules/seo/routes.ts src/modules/mailer/service.ts src/lib/cache.ts
git commit -m "feat(events): support publish_status and allowed_user_ids in queries and types"
```

---

### Task 3: Admin Meeting Form Dialog UI & Handlers

**Files:**
- Modify: `src/modules/admin/routes.tsx`
- Modify: `src/modules/admin/views.tsx`
- Modify: `src/lib/i18n/translations.ts`

**Interfaces:**
- Consumes: `users`, `publish_status`, `allowed_user_ids`
- Produces: Form fields for `publish_status` and dynamic searchable multi-select for `allowed_user_ids`.

- [ ] **Step 1: Add i18n Translations**
Add English and Persian translations for `admin.field.publish_status`, `publish_status.public`, `publish_status.private`, `publish_status.restricted`, `admin.crud.allowed_users`, `admin.crud.search_users`, `admin.crud.select_all`, `admin.crud.reset`, etc.

- [ ] **Step 2: Update Admin Meeting Form Dialog & Tables in `src/modules/admin/routes.tsx` & `src/modules/admin/views.tsx`**
1. Replace `access_status` with `publish_status` in `config.meets.columns`, `config.meets.searchFields`, and `config.meets.fields`.
2. In `renderCellContent` (`src/modules/admin/views.tsx`), render `publish_status` badge (`restricted` -> `badge-warning`, `private` -> `badge-neutral`, `public` -> `badge-success badge-outline`).
3. In `src/modules/admin/routes.tsx`:
   - Elevate Alpine `x-data` to `<form>`:
     ```tsx
     x-data={`{
       publishStatus: '${values.publish_status ?? "public"}',
       userSearch: '',
       allUsers: ${JSON.stringify(users.map((u) => ({ id: u.id, email: u.email })))},
       selectedUserIds: ${JSON.stringify(currentMeetAllowedUserIds ?? [])},
       get filteredUsers() {
         if (!this.userSearch.trim()) return this.allUsers;
         const q = this.userSearch.toLowerCase();
         return this.allUsers.filter(u => u.email.toLowerCase().includes(q));
       },
       selectAllFilteredUsers() {
         const ids = this.filteredUsers.map(u => u.id);
         this.selectedUserIds = Array.from(new Set([...this.selectedUserIds, ...ids]));
       },
       clearSelectedUsers() {
         this.selectedUserIds = [];
       }
     }`}
     ```
   - Render `publish_status` `<select name="publish_status" x-model="publishStatus">`.
   - Add restricted user selector box (`x-show="publishStatus === 'restricted'"` with `x-cloak` and explicit `type="button"` on control buttons).
   - In `POST /dashboard/admin/meets` (create) and `POST /dashboard/admin/meets/:id` (update):
     - Only parse `allowed_user_ids` if `publish_status === 'restricted'`.
     - In transaction, update `meets.publish_status` and sync `meet_allowed_users`.
   - RBAC: Filter `rowsFor("meets")` to exclude `publish_status = 'private'` if user is not Super Admin.

- [ ] **Step 3: Commit**
```bash
git add src/modules/admin/routes.tsx src/modules/admin/views.tsx src/lib/i18n/translations.ts
git commit -m "feat(admin): add publish_status and user picker to meeting form dialog"
```

---

### Task 4: UI Badges, Event Routes Authorization & Analytics Guard

**Files:**
- Modify: `src/ui/meet-badges.tsx`
- Modify: `src/ui/meet-card.tsx`
- Modify: `src/modules/events/views.tsx`
- Modify: `src/modules/events/routes.tsx`
- Modify: `src/modules/landing/routes.tsx`
- Modify: `src/modules/dashboard/user/routes.tsx`

**Interfaces:**
- Consumes: `meet.publish_status`, `meet.allowed_user_ids`
- Produces: Publish status badges (for admins/restricted users) and route protection on `/meets/:id` and RSVP attend/leave endpoints.

- [ ] **Step 1: Update Badges in `src/ui/meet-badges.tsx` and `src/ui/meet-card.tsx`**
Add `MeetPublishBadge` component or enhance `MeetAccessBadge` to show `restricted` or `private` status where appropriate.

- [ ] **Step 2: Update `src/modules/events/routes.tsx`**
1. In `GET /meets/:id`:
   - Pass current authenticated user context (`{ userId: user?.sub, isSuperAdmin: user?.role_title === "Super Admin" }`) to `getMeetById(database, id, viewer)`.
   - If not accessible, return `c.notFound()`.
   - Call `recordMeetVisit` *after* `getMeetById` passes the authorization check.
2. In `POST /meets/:id/attend` and `DELETE /meets/:id/attend`:
   - Check `getMeetById(database, id, viewer)` before allowing attendance or sending confirmation emails.

- [ ] **Step 3: Update `src/modules/landing/routes.tsx` and explore routes**
Pass viewer context when querying meets.

- [ ] **Step 4: Commit**
```bash
git add src/ui/meet-badges.tsx src/ui/meet-card.tsx src/modules/events/views.tsx src/modules/events/routes.tsx src/modules/landing/routes.tsx src/modules/dashboard/user/routes.tsx
git commit -m "feat(ui): update badges and enforce meet publish status in routes and RSVP handlers"
```

---

### Task 5: Testing & Verification

**Files:**
- Modify: `src/modules/events/events.test.ts`
- Modify: `src/lib/database/database.test.ts`

- [ ] **Step 1: Write Automated Integration Tests in `src/modules/events/events.test.ts`**
Test:
1. Migration 012 execution and backfill.
2. `createMeet` with `public`, `private`, and `restricted` + `allowedUserIds`.
3. `filterMeets` and `getMeetById` queries under:
   - Anonymous viewer
   - Regular user not in `allowedUserIds`
   - Regular user in `allowedUserIds`
   - Super Admin
4. RSVP / attend route authorization checks.
5. Updating meet publish status and changing allowed users.

- [ ] **Step 2: Run Tests and Typecheck**
Run: `bun test` and `bun run check`
Expected: All tests pass, 0 type errors.

- [ ] **Step 3: Commit**
```bash
git add src/modules/events/events.test.ts src/lib/database/database.test.ts
git commit -m "test(events): add test suite for meet publish status and allowed users"
```
