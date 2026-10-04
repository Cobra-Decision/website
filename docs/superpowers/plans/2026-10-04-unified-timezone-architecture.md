# Unified Timezone & DateTime Architecture Implementation Plan

> **Goal:** Eliminate date/time confusion across the entire application by establishing a clean, unified, DRY conversion boundary: All database timestamps are canonical UTC ISO strings; all user inputs are converted from user timezone to UTC at ingress; all displays are converted from UTC to user timezone at egress.

---

## Proposed Changes

### Phase 1: Core Datetime Utility Upgrade (`src/modules/events/datetime.ts`)
Upgrade datetime utilities to eliminate hardcoded Tehran offsets and provide pure, reliable zero-dependency timezone conversions using standard JavaScript `Intl.DateTimeFormat` and `Date`.

#### 1. `toUtcIso(date: string, time: string, timeZone = "Asia/Tehran"): string`
- Parse date (`YYYY-MM-DD`) and time (`HH:MM`).
- Calculate the exact UTC offset for `timeZone` at the given instant.
- Return standard UTC ISO 8601 string `YYYY-MM-DDTHH:mm:ss.000Z`.

#### 2. `formatUtcDateTime(utcTimestamp: string | null | undefined, locale: Locale = "en", timeZone = "Asia/Tehran")`
- Robust parsing for SQLite timestamps (`YYYY-MM-DD HH:MM:SS` or `YYYY-MM-DDTHH:MM:SSZ`).
- Format localized `date`, `time` (24-hour format), and `full` string for the target timezone.

#### 3. `formatCalendarUtc(dateStr: string, timeStr: string, durationMinutes = 60, timeZone = "Asia/Tehran")`
- Support timezone-aware Google & Outlook calendar format generation.

---

### Phase 2: Context Timezone Resolution Upgrade (`src/lib/i18n/context.ts`)
Enhance `getTimezone(c, defaultTz = "Asia/Tehran")` to check:
1. `c?.get("auth")?.user?.timezone` or `c?.get("user")?.timezone` (if authenticated and has stored preference).
2. `c?.req.header("hx-timezone")` or `c?.req.header("x-timezone")`.
3. `getCookie(c, "tz")` or `getCookie(c, "timezone")`.
4. Fallback: `defaultTz` (`"Asia/Tehran"`).

---

### Phase 3: Ingress Inceptors & Route Fixes (`src/modules/admin/routes.tsx`)

#### 1. Mail Scheduler Ingress (`POST /dashboard/admin/mail-scheduler/schedule`)
- Extract timezone `const tz = getTimezone(c)`.
- Convert `scheduleDate` + `scheduleTime` using `toUtcIso(scheduleDate, scheduleTime, tz)`.
- Save converted UTC timestamp to `scheduled_emails.scheduled_for`.

#### 2. Meet Creation & Update Ingress (`POST /dashboard/admin/meets` & `POST /dashboard/admin/meets/:id`)
- Extract timezone `const tz = getTimezone(c)`.
- Generate `scheduled_at_utc = toUtcIso(submitted.scheduled_date, submitted.scheduled_time, tz)`.
- Save `scheduled_at_utc` along with `scheduled_date` and `scheduled_time`.

---

### Phase 4: Egress Views & Admin Calendar Alignment

#### 1. Admin Calendar View (`src/modules/admin/calendar-views.tsx`)
- Pass `timeZone?: string` to `AdminCalendarGrid` and `AdminCalendarView`.
- In `routes.tsx`, pass `timeZone={tz}` from `getTimezone(c)`.
- Group meets into day matrix using the meet's local date in the viewer's `timeZone`.

#### 2. Email Templates (`src/modules/mailer/templates.ts` & `src/modules/mailer/service.ts`)
- Ensure email notifications (e.g. tag reminders, attendee reminders, RSVP confirmations) format the meet time according to the recipient attendee's `user.timezone || "Asia/Tehran"`.

---

### Phase 5: Verification & Automated Test Suite

#### 1. Unit Tests (`src/modules/events/timezone.test.ts`)
Add thorough automated tests verifying:
- Timezone conversions for Tehran, UTC, New York, Tokyo, and London.
- Roundtrip consistency: `Local -> toUtcIso -> formatUtcDateTime -> Local`.
- Ingress conversion for mail scheduler payload.
- Edge cases (leap years, month boundaries, midnight crossings).

#### 2. Verification Commands
- `bun test`
- `bun run check`
- `bun run build:css`

---

## Verification Plan

### Automated Tests
```bash
# Run unit test suite
bun test src/modules/events/timezone.test.ts

# Run all project tests
bun test

# Run TypeScript type check
bun run check
```

### Manual Verification Checklist
1. Open Admin Mail Scheduler (`/dashboard/admin/mail-scheduler`).
2. Schedule a broadcast for a specific future date and time (e.g., 18:30).
3. Verify that the scheduled queue table displays 18:30 (matching the input) rather than shifting backwards to UTC.
4. Open Admin Calendar (`/dashboard/admin/calendar`).
5. Verify meetings appear on the exact localized day and display the correct local time badge.
