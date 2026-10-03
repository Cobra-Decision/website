# Unified Calendar & DatePicker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## Goal
Ensure 100% of date inputs across CobraDecision use the unified Persian/English `<DatePicker>` primitive, integrate `DatePicker` into `src/ui/forms/`, eliminate any remaining native browser `<input type="date">` occurrences, and prepare the foundation for the upcoming Unified Admin Calendar view.

---

## Task Breakdown & Checklists

### Task 1: Integrate DatePicker into `src/ui/forms` Primitive System
- [ ] **Step 1: Move or Re-export DatePicker in `src/ui/forms/`**
  - Ensure `src/ui/forms/index.ts` exports `DatePicker` and `DatePickerProps`.
  - Export either by moving `src/ui/date-picker.tsx` to `src/ui/forms/date-picker.tsx` (retaining backward-compatible re-export in `src/ui/date-picker.tsx`) or exporting directly.
- [ ] **Step 2: Update DatePicker Props & Size Variants**
  - Ensure `<DatePicker>` supports `size?: "xs" | "sm" | "md" | "lg"` and spreads standard props onto the input/wrapper.
- [ ] **Step 3: Run DatePicker Unit Tests**
  - Run `bun test src/ui/date-picker.test.ts` or `src/ui/forms/date-picker.test.ts`.
- [ ] **Step 4: Commit**
  - `refactor(ui): export DatePicker from forms UI kit`

---

### Task 2: Standardize Admin CRUD Date Handling
- [ ] **Step 1: Replace generic date input branch in `src/modules/admin/routes.tsx`**
  - In `fieldInput(field: string)` inside `src/modules/admin/routes.tsx`:
    - Check if `field === "scheduled_date" || field.includes("date")`.
    - Render `<DatePicker name={field} value={String(values[field] ?? "")} locale={locale} required={field === "scheduled_date"} />`.
- [ ] **Step 2: Verify Admin CRUD Forms**
  - Ensure both `meets` and any future date-bearing admin resources render the unified Persian/English DatePicker popover.
- [ ] **Step 3: Run Admin Integration Tests**
  - Run `bun test test/unit/admin-*.test.ts` and `bun test test/features.integration.test.ts`.
- [ ] **Step 4: Commit**
  - `refactor(admin): use unified DatePicker for all admin resource date inputs`

---

### Task 3: Audit & Clean Import Paths Across Views
- [ ] **Step 1: Update imports in user and admin views**
  - `src/modules/dashboard/user/views.tsx` -> import `{ DatePicker } from "../../../ui/forms"`
  - `src/modules/admin/mail-scheduler-views.tsx` -> import `{ DatePicker } from "../../ui/forms"`
  - `src/modules/admin/routes.tsx` -> import `{ DatePicker } from "../../ui/forms"`
- [ ] **Step 2: Run Full Verification Suite**
  - Run `bun run check` (TypeScript typecheck).
  - Run `bun test` (Full test suite).
  - Run `bun run build:css` (Tailwind build).
- [ ] **Step 3: Commit**
  - `refactor(views): import DatePicker from unified forms primitive module`

---

### Task 4 (Roadmap): Unified Admin Calendar Schedule View
- [ ] **Step 1: Create SSR Calendar Grid Component**
  - Create `src/modules/admin/calendar-views.tsx` with a responsive CSS grid / table.
  - Implement Persian (Jalali) and Gregorian month matrix generators.
- [ ] **Step 2: Add Route Handler & HTMX Navigation**
  - Add `/dashboard/admin/calendar` route in `src/modules/admin/routes.tsx`.
  - Support `month` and `year` query parameters with HTMX swaps (`hx-target="#admin-calendar-grid"`).
- [ ] **Step 3: Add Navigation Link to Admin Drawer**
  - Add Calendar navigation item in `AdminLayout` / `src/modules/admin/views.tsx`.
- [ ] **Step 4: Write Integration Tests**
  - Test calendar query resolution and month switching in `test/unit/admin-calendar.test.ts`.
- [ ] **Step 5: Run Full Verification & Commit**
  - `feat(admin): implement unified admin calendar schedule view`
