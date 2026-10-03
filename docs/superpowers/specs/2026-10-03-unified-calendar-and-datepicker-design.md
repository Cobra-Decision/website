# Unified Calendar & DatePicker Specification: Full Audit, Roadmap & Design

## 1. Problem Statement & Motivation
The CobraDecision platform supports English (`en`, LTR, Gregorian) and Persian (`fa`, RTL, Shamsi / Jalali) locales with localized typography (`Vazirmatn`) and custom numeric/calendar formats.

Currently:
1. Some views rely on the custom unified `<DatePicker />` primitive (`src/ui/date-picker.tsx`), which seamlessly handles Jalali/Gregorian calendar conversion, popover UI, and ISO-synchronized hidden inputs.
2. In other areas (e.g. generic Admin CRUD forms for non-meet models or time inputs), raw `<input type="date">` / `<input type="time">` or manual input definitions exist without unified styling, or `<DatePicker />` is isolated in `src/ui/date-picker.tsx` rather than exported directly from the unified UI primitives kit (`src/ui/forms/`).
3. There is a planned **Unified Admin Calendar** dashboard view (`docs/FEATURE_IDEAS.md`) for full schedule exploration that has not yet been implemented.

This document provides:
- An **exhaustive, complete inventory audit** of all date/calendar inputs across the codebase.
- Architectural specifications for **exporting `<DatePicker>` as a first-class member of `src/ui/forms/`**.
- Standardization rules for all date selection across the app to guarantee 100% Persian/English bilingual consistency.
- Roadmap and design for the **Unified Calendar Schedule View** (Admin Calendar).

---

## 2. Exhaustive Audit: Current Calendar & Date Usages in Codebase

| # | File Path | Line(s) | UI / Feature Element | Component Type | Uses Unified DatePicker? | Status & Action Required |
|---|---|---|---|---|---|---|
| 1 | `src/modules/admin/routes.tsx` | 224–229 | Admin CRUD Modal for `meets` resource (`scheduled_date` field) | `<DatePicker name="scheduled_date" ... />` | **YES** | Already using unified DatePicker. Ensure prop consistency. |
| 2 | `src/modules/admin/routes.tsx` | 208–214, 294–301 | Admin CRUD Modal for generic resources (`inputType(field)` where `field.includes("date")`) | `<input type="date" name={field} ... />` | **NO** (Native Browser Date Input) | **MIGRATE**: Replace generic date branch with `<DatePicker name={field} ... />`. |
| 3 | `src/modules/dashboard/user/views.tsx` | 221–225 | User Meets Filter Bar (`startDate`) | `<DatePicker name="startDate" ... />` | **YES** | Already using unified DatePicker. |
| 4 | `src/modules/dashboard/user/views.tsx` | 227–231 | User Meets Filter Bar (`endDate`) | `<DatePicker name="endDate" ... />` | **YES** | Already using unified DatePicker. |
| 5 | `src/modules/admin/mail-scheduler-views.tsx` | 527–531 | Admin Mail Scheduler broadcast form (`scheduleDate`) | `<DatePicker name="scheduleDate" ... />` | **YES** | Already using unified DatePicker. |
| 6 | `src/modules/admin/mail-scheduler-views.tsx` | 163, 535 | Mail Scheduler Time inputs (`scheduleTime`, `sendTime`) | `<Input type="time" ... />` | N/A (Time Input) | Uses unified `<Input />` primitive. Keep or pair with time helper. |
| 7 | `src/ui/forms/index.ts` | 1–10 | Forms UI Kit Central Barrel Export | Barrel | **NO** | **MIGRATE**: Re-export `DatePicker` and `DatePickerProps` from `src/ui/forms/index.ts` (moving component to `src/ui/forms/date-picker.tsx` or re-exporting). |
| 8 | `src/modules/admin/calendar-views.tsx` *(Future/Roadmap)* | N/A | Central Admin SSR Schedule Grid | Server-Rendered CSS Grid Calendar | **ROADMAP** | Planned feature in `docs/FEATURE_IDEAS.md`. Design outlined below. |

---

## 3. Component Architecture & Standards

### 3.1. Unified DatePicker (`src/ui/forms/date-picker.tsx`)
The unified DatePicker must fulfill:
1. **Zero Client Bundles**: Pure server-rendered JSX emitting standard daisyUI + Tailwind markup with localized Alpine.js reactive state (`x-data`).
2. **Dual-Calendar Support**:
   - Gregorian (`en`): Month names (`January`–`December`), weekdays (`Su`–`Sa`), ISO string format (`YYYY-MM-DD`).
   - Jalali / Shamsi (`fa`): Month names (`فروردین`–`اسفند`), weekdays (`ش`–`ج`), Persian digit formatting (`۰`–`۹`), and bidirectional arithmetic conversion via `src/lib/datetime/jalali.ts`.
3. **Forms Kit Integration**:
   - Direct export from `src/ui/forms/`.
   - Wrapping in `<FormField label={...} required={...} />`.
   - Hidden `<Input type="hidden" name={name} ... />` forwarding standard `YYYY-MM-DD` on form submission.
   - Visible input display with toggleable popover, month/year selector, and quick action buttons ("Today" / "امروز", "Clear" / "پاک کردن").

### 3.2. Generic Admin Resource Handling
In `src/modules/admin/routes.tsx`:
```tsx
const fieldInput = (field: string) => {
  if (field === "scheduled_date" || field.includes("date")) {
    return (
      <DatePicker
        name={field}
        value={String(values[field] ?? "")}
        locale={locale}
        required={field === "scheduled_date"}
      />
    );
  }
  // ... other fields
};
```

---

## 4. Unified Admin Calendar Roadmap (SSR Grid View)

### 4.1. Concept
A dedicated schedule calendar view in `/dashboard/admin/calendar` (or tab within Events/Meets):
- Monthly / Weekly SSR calendar grid.
- HTMX navigation for previous/next months (`hx-get="/dashboard/admin/calendar?month=...&year=..."`).
- Displays scheduled meets with status badges (`published`, `restricted`, `upcoming`, `live`, `completed`).
- Direct click-to-edit modal or link to meeting details.

---

## 5. Verification & Acceptance Criteria
1. `bun test` runs with 100% passing tests (including `src/ui/date-picker.test.ts`).
2. `bun run check` completes with 0 TypeScript errors.
3. Every date input in Admin and User dashboards renders the unified Persian/English DatePicker popover.
4. Form submissions reliably pass ISO `YYYY-MM-DD` strings to Hono endpoints.
