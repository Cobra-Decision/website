# Unified Timezone & DateTime Architecture Specification

## 1. Executive Summary & Problem Analysis
In the CobraDecision platform, dates and times are collected from users (admins scheduling meets or emails, users filtering events) and displayed across multiple surfaces (Admin Calendar, Mail Scheduler, Email Templates, User Dashboards, Public Meet Cards).

### Root Causes of Time Confusion
1. **Hardcoded Offset in `toUtcIso`**: `src/modules/events/datetime.ts` hardcoded `const tehranOffsetMinutes = 210` (`+03:30`). It completely ignored other user timezones and failed when daylight saving rules apply or when non-Tehran admins schedule items.
2. **Naive Timestamps in Ingress**:
   - In `src/modules/admin/routes.tsx` (`/mail-scheduler/schedule`), `scheduleDate` and `scheduleTime` were combined as naive string `YYYY-MM-DDTHH:MM:00` and directly saved to `scheduled_emails.scheduled_for`.
   - In contrast, egress views like `formatUtcDateTime` treat `scheduled_for` as a UTC string and subtract the user's timezone offset when displaying it. This created **double timezone conversion** (e.g. scheduling for 14:00 showed up as 10:30 in the admin table).
3. **Calendar Date Matching by Naive String**:
   - In `src/modules/admin/calendar-views.tsx`, meets were filtered by naive `m.scheduled_date === iso`. If a meet is stored with `scheduled_at_utc` or scheduled near midnight in UTC, it may fall on different days depending on viewer's timezone.
4. **Email Reminders & Notification Inconsistency**:
   - Email templates used hardcoded `"Asia/Tehran"` instead of the recipient attendee's `user.timezone`.
5. **Context Timezone Fallback Order**:
   - `getTimezone(c)` checked headers and cookies, but didn't prioritize the authenticated user's persistent database preference (`auth.user.timezone`).

---

## 2. Industry Standard Timezone Architecture (UTC Single Source of Truth)

```
                       ┌─────────────────────────────────────────┐
                       │           CLIENT / BROWSER              │
                       │ Timezone: America/New_York (UTC-4)      │
                       └───────────────────┬─────────────────────┘
                                           │
          [INGRESS] User submits           │        [EGRESS] Server renders
          Local "2026-10-15 15:30"         │        Localized "15:30"
          + Timezone Context               │        from Stored UTC
                                           ▼
                       ┌─────────────────────────────────────────┐
                       │            HONO MIDDLEWARE              │
                       │ Resolves Context Timezone:              │
                       │ 1. auth.user.timezone                   │
                       │ 2. HX-Timezone header                   │
                       │ 3. tz cookie                            │
                       │ 4. Fallback: "Asia/Tehran"              │
                       └───────────────────┬─────────────────────┘
                                           │
                                           ▼
                       ┌─────────────────────────────────────────┐
                       │     INTERCEPTOR / HELPER LAYER          │
                       │                                         │
                       │ toUtcIso(date, time, tz)                │
                       │ ───────────────► 2026-10-15T19:30:00Z   │
                       │                                         │
                       │ formatUtcDateTime(utcStr, locale, tz)   │
                       │ ◄─────────────── 2026-10-15 15:30       │
                       └───────────────────┬─────────────────────┘
                                           │
                                           ▼
                       ┌─────────────────────────────────────────┐
                       │          SQLITE DATABASE (WAL)          │
                       │ Canonical Storage: UTC ISO 8601 Strings │
                       │ meets.scheduled_at_utc                  │
                       │ scheduled_emails.scheduled_for (UTC)    │
                       └─────────────────────────────────────────┘
```

---

## 3. Exhaustive Codebase Inventory & Action Matrix

### 3.1. Ingress Points (User $\to$ Code $\to$ DB)
| File & Location | Current Behavior | Flaw | Target Implementation |
|---|---|---|---|
| `src/modules/events/datetime.ts` (`toUtcIso`) | Uses static `210` min offset. | Hardcoded to Tehran; ignores passed timezones. | Rewrite using native `Intl.DateTimeFormat` + `Date` math to convert any $(Y, M, D, H, m, tz) \to \text{UTC ISO}$. |
| `src/modules/admin/routes.tsx` (Line ~894 & ~1031) | `toUtcIso(date, time)` | Doesn't pass admin's timezone `tz`. | Pass `getTimezone(c)`: `toUtcIso(date, time, tz)`. |
| `src/modules/admin/routes.tsx` (`/mail-scheduler/schedule`) | Combines `scheduleDate` & `scheduleTime` as naive string. | Saves naive string to UTC column `scheduled_for`. | Call `toUtcIso(scheduleDate, scheduleTime, tz)` before saving into `scheduled_emails.scheduled_for`. |
| `src/modules/admin/routes.tsx` (`/mail-scheduler/rules/:id/update`) | Validates `sendTime` format (`HH:MM`). | Good, but needs consistent timezone documentation. | Retain `send_time` as local daily run time string (`06:00`), checked against user's local timezone. |

### 3.2. Egress Points (DB $\to$ Code $\to$ UI / Email)
| File & Location | Current Behavior | Flaw | Target Implementation |
|---|---|---|---|
| `src/modules/events/datetime.ts` (`formatUtcDateTime`) | Formats UTC string to localized date & time in `timeZone`. | Correct, but needed strict typing & robust regex parsing for both SQLite `YYYY-MM-DD HH:MM:SS` and ISO formats. | Ensure standard fallback and support for 24h English and Persian formats. |
| `src/modules/events/datetime.ts` (`formatLocalizedDate`) | Formats date string to localized date name. | Uses 12:00 UTC anchor. | Standardize to target timezone format. |
| `src/modules/admin/calendar-views.tsx` | Filters meets by `m.scheduled_date === iso`. | Fails if meet UTC time shifts calendar date in viewer's timezone. | Convert meet's UTC timestamp to viewer's local `YYYY-MM-DD` in `timeZone` before indexing in day matrix. |
| `src/modules/admin/mail-scheduler-views.tsx` | Calls `formatUtcDateTime(job.scheduled_for, locale, timeZone)`. | Worked, but showed double offset due to ingress bug. | Fixed automatically once ingress saves UTC strings. |
| `src/modules/admin/mail-editor-views.tsx` | Calls `formatUtcDateTime(tpl.updated_at, locale, timeZone)`. | Correct. | Retain. |
| `src/modules/admin/views.tsx` (`renderCellContent`) | Formats `created_at`, `updated_at`, `deleted_at`, `scheduled_for` using `formatUtcDateTime`. | Correct. | Retain. |
| `src/modules/mailer/templates.ts` | Uses hardcoded `"Asia/Tehran"` in email calendar invites. | Attendees outside Tehran receive invites with wrong local representation. | Pass attendee's `user.timezone` into calendar builders and email date formatters. |
| `src/modules/mailer/service.ts` | Calculates reminder send dates for users. | Uses `user.timezone || "Asia/Tehran"`. | Fully correct; ensure all email queues propagate `user.timezone`. |
| `src/ui/meet-card.tsx` & `src/modules/events/views.tsx` | Displays meet time and Google/Outlook calendar export links. | Uses `formatCalendarUtc` & `buildCalendarLinks`. | Ensure links use `meet.scheduled_at_utc` when available. |

### 3.3. Context & Guard Layer
| File & Location | Current Behavior | Flaw | Target Implementation |
|---|---|---|---|
| `src/lib/i18n/context.ts` (`getTimezone`) | Checks `HX-Timezone` header $\to$ `tz` cookie $\to$ `"Asia/Tehran"`. | Ignores authenticated user's stored database timezone preference. | Priority: `c.get("auth")?.user?.timezone` $\to$ `HX-Timezone` header $\to$ `tz` cookie $\to$ `"Asia/Tehran"`. |
| `src/ui/layout.tsx` | Injects inline JS to set `tz` cookie and `HX-Timezone` header via `Intl.DateTimeFormat().resolvedOptions().timeZone`. | Correct. | Retain client auto-detection script. |

---

## 4. Verification & Testing Requirements
1. **Automated Unit Tests (`src/modules/events/timezone.test.ts`)**:
   - `toUtcIso` conversion for multiple IANA timezones:
     - Tehran (`Asia/Tehran`): +03:30
     - London (`UTC` / `Europe/London`): +00:00 / +01:00
     - New York (`America/New_York`): -04:00 / -05:00
     - Tokyo (`Asia/Tokyo`): +09:00
   - Roundtrip test: Local Date/Time $\to$ `toUtcIso` $\to$ `formatUtcDateTime` $\equiv$ Original Local Date/Time.
   - Mail Scheduler Ingress test: `scheduleDate` + `scheduleTime` in NY timezone produces exact UTC timestamp matching expected ISO string.
2. **Type Safety**: `bun run check` (0 errors).
3. **Full Suite**: `bun test` (100% pass rate).
