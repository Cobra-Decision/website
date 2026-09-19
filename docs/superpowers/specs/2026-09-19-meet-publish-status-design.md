# Specification: Meeting Publish Status & User Restrictions

## 1. Overview & Objective
Add a publish status attribute for meetings with three levels:
1. **Public (`public`)**: Visible to all users and anonymous visitors across landing, explores, search, sitemap, and detail views.
2. **Private (`private`)**: Hidden from public feeds and general users; visible only to Super Admins.
3. **Restricted (`restricted`)**: Visible only to assigned/selected specific users, presenter, and Super Admins.

The admin meeting form dialog must support selecting the publish status and, when `restricted` is active, picking specific users via a searchable multi-select UI.

---

## 2. Database Schema & Migration

### 2.1 Table: `meet_publish_status_types`
Lookup table to maintain supported publish status types.
```sql
CREATE TABLE IF NOT EXISTS meet_publish_status_types (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);
```

Initial seed records:
- `public`: Title "Public" / "عمومی"
- `private`: Title "Private" / "خصوصی"
- `restricted`: Title "Restricted" / "محدود به کاربران انتخابی"

### 2.2 Alter Table `meets`
Add column `publish_status`:
```sql
ALTER TABLE meets ADD COLUMN publish_status TEXT NOT NULL DEFAULT 'public' REFERENCES meet_publish_status_types(id);
```

### 2.3 Table: `meet_allowed_users`
Join table mapping restricted meets to permitted users:
```sql
CREATE TABLE IF NOT EXISTS meet_allowed_users (
  meet_id TEXT NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (meet_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meet_allowed_users_user ON meet_allowed_users(user_id);
```

### 2.4 Migration Sequence
- Add Migration `012_meet_publish_status_and_allowed_users` in `src/lib/database/migration.ts`.
- Update baseline schemas: `src/lib/schema.sql` and `src/modules/events/schema.sql`.
- Update seed scripts: `src/lib/database/seeding.ts` and `src/lib/seed.ts`.

---

## 3. Application Data Layer, Security & Queries

### 3.1 Types (`src/modules/events/types.ts`)
- `MeetPublishStatus = "public" | "private" | "restricted"`
- Update `Meet`: include `publish_status: MeetPublishStatus`
- Update `MeetWithDetails`: include `allowed_user_ids: string[]`
- Update `CreateMeetInput`: include `publishStatus?: MeetPublishStatus`, `allowedUserIds?: string[]`

### 3.2 Queries & Visibility Logic (`src/modules/events/queries.ts`)
- `createMeet` / `updateMeet`: persist `publish_status` and sync `meet_allowed_users` in a transaction.
- `hydrateMeets`: hydrate `allowed_user_ids`.
- Query filtering (`filterMeets`, `getUpcomingMeets`, `getMeetById`):
  - Viewer parameter: `viewer?: { userId?: string; isSuperAdmin?: boolean }`
  - If `viewer?.isSuperAdmin`: return all.
  - If `viewer?.userId`: `(publish_status = 'public' OR (publish_status = 'restricted' AND (presenter_id = ? OR EXISTS (SELECT 1 FROM meet_allowed_users mau WHERE mau.meet_id = m.id AND mau.user_id = ?))))` (binds `viewer.userId` twice).
  - If anonymous viewer (no `viewer?.userId`): `publish_status = 'public'`.

### 3.3 Security & Leak Prevention Across Modules
- **Attend/RSVP Guard (`src/modules/events/routes.tsx`)**: Check viewer authorization on `POST /meets/:id/attend` and `DELETE /meets/:id/attend`. Reject with 404/403 before RSVPing or sending confirmation emails.
- **Analytics Visit Timing (`src/modules/events/routes.tsx`)**: Call `recordMeetVisit` only after `getMeetById` confirms viewer authorization.
- **Sitemap Filtering (`src/modules/seo/routes.ts`)**: Include only `publish_status = 'public'`.
- **Automated Mailer Broadcasts (`src/modules/mailer/service.ts`)**: In `sendFavoriteTagMeetReminders`, restrict queries to `publish_status = 'public'`.
- **Landing Cache & Statistics (`src/lib/cache.ts`)**: Aggregate stats and upcoming carousel strictly for `publish_status = 'public'`.
- **Admin RBAC (`src/modules/admin/routes.tsx`)**: Non-Super-Admins in admin meet listings do not see or edit `private` meets.

---

## 4. UI & Form Dialog

### 4.1 Admin Meeting Modal Dialog (`src/modules/admin/routes.tsx`)
- Form-level Alpine.js component (`x-data` on `<form>`) holding `publishStatus`, `userSearch`, `allUsers`, and `selectedUserIds`.
- Render `publish_status` select field with options:
  - Public (`public`)
  - Private (`private`)
  - Restricted to Specific Users (`restricted`)
- Interactive restricted user selector (`x-show="publishStatus === 'restricted'"`):
  - Responsive grid layout with search input and select all / clear buttons (explicit `type="button"`).
  - Safe JSON data serialization.
- Backend synchronization: only save `allowed_user_ids` if `publish_status === 'restricted'`.

### 4.2 Badges & Details View (`src/ui/meet-badges.tsx`, `src/modules/admin/views.tsx`, `src/ui/meet-card.tsx`)
- Badge in CrudTable for `publish_status` (`badge-success`, `badge-neutral`, `badge-warning`).
- Clear i18n label distinction between `access_status` ("Room Link Access") and `publish_status` ("Listing Visibility").

---

## 5. Verification & Testing
- Unit and integration tests in `src/modules/events/events.test.ts` to verify:
  1. Migration applies cleanly.
  2. Public meets are visible to all.
  3. Private meets are hidden from anonymous and regular users, visible only to Super Admins.
  4. Restricted meets are visible only to assigned users, presenter, and Super Admins.
  5. RSVP / attend route blocks unauthorized users on private/restricted meets.
  6. Admin form submission creates and updates meetings and allowed users properly.
