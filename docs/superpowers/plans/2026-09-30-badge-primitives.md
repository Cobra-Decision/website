# Implementation Plan: UI Kit Badge Primitive & View Migration

**Date:** 2026-09-30  
**Spec Reference:** `docs/superpowers/specs/2026-09-30-badge-primitives-design.md`

---

## Task Breakdown & Checklists

### Task 1: Create `<Badge />` Primitive, Types, Export, & Unit Tests
- [ ] Update `src/ui/forms/types.ts` to export `BadgeVariant`.
- [ ] Create `src/ui/forms/badge.tsx` with `as` polymorphic tag support, size, variant, outline, icon/iconRight, and full attribute forwarding.
- [ ] Export `Badge` and `BadgeProps` in `src/ui/forms/index.ts`.
- [ ] Create `src/ui/forms/badge.test.ts` testing polymorphic tags (`span`, `div`, `button`, `label`, `a`), variant classes, size classes, outline, icons, and prop forwarding.
- [ ] Run `bun test src/ui/forms/badge.test.ts` and `bun run check`.

### Task 2: Refactor Domain Badge Components
- [ ] Refactor `src/ui/meet-badges.tsx` (`MeetStatusBadge`, `MeetAccessBadge`, `MeetPublishBadge`) to use `<Badge>`.
- [ ] Refactor `src/ui/tag-badge.tsx` to use `<Badge>`.
- [ ] Verify `bun test` and `bun run check`.

### Task 3: Refactor Core UI Components
- [ ] Refactor `src/ui/dashboard.tsx` (lines 63, 150) to use `<Badge>`.
- [ ] Refactor `src/ui/public-header.tsx` (line 138) to use `<Badge>`.
- [ ] Refactor `src/ui/tag-selector.tsx` (lines 46, 86) to use `<Badge>`.
- [ ] Refactor `src/ui/meet-card.tsx` (lines 77, 80) to use `<Badge>`.
- [ ] Verify `bun test` and `bun run check`.

### Task 4: Refactor Admin Modules
- [ ] Refactor `src/modules/admin/views.tsx` (lines 188-204) to use `<Badge>`.
- [ ] Refactor `src/modules/admin/database-views.tsx` (lines 115, 172, 235) to use `<Badge>`.
- [ ] Refactor `src/modules/admin/report-views.tsx` (lines 98, 100) to use `<Badge>`.
- [ ] Refactor `src/modules/admin/platforms-views.tsx` (lines 220, 236, 279, 389) to use `<Badge>`.
- [ ] Refactor `src/modules/admin/routes.tsx` (line 614) to use `<Badge>`.
- [ ] Refactor `src/modules/admin/mail-scheduler-views.tsx` (lines 40, 44, 679, 735, 755, 760) to use `<Badge>`.
- [ ] Refactor `src/modules/admin/mailer-views.tsx` (lines 375, 427, 441) to use `<Badge>`.
- [ ] Refactor `src/modules/admin/mail-editor-views.tsx` (lines 163, 339) to use `<Badge>`.
- [ ] Refactor `src/modules/admin/mail-placeholders-component.tsx` (line 48) to use `<Badge>`.
- [ ] Verify `bun test` and `bun run check`.

### Task 5: Refactor User & Landing Views
- [ ] Refactor `src/modules/landing/about-views.tsx` (lines 74, 86, 151, 158) to use `<Badge>`.
- [ ] Refactor `src/modules/events/views.tsx` (lines 254-256) to use `<Badge>`.
- [ ] Refactor `src/modules/dashboard/account/views.tsx` (line 118) to use `<Badge>`.
- [ ] Refactor `src/modules/dashboard/user/views.tsx` (line 26) to use `<Badge>`.
- [ ] Verify `bun test` and `bun run check`.

### Task 6: Comprehensive Verification Pipeline
- [ ] Run `bun run check` (TypeScript typecheck).
- [ ] Run `bun test` (Complete test suite).
- [ ] Run `bun run build:css` (Tailwind CSS build).
