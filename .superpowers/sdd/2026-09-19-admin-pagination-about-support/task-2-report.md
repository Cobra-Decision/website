# Task 2 Report: Reusable Admin Pagination UI Component

## Overview
Implemented the reusable `<Pagination />` JSX UI component in `src/modules/admin/pagination-view.tsx` and integrated it into the administrative `CrudTable` component in `src/modules/admin/views.tsx`.

## Key Deliverables & Changes

1. **`src/modules/admin/pagination-view.tsx`**:
   - Implemented `Pagination({ state, resource, baseUrl, targetId, query, locale }: PaginationProps)`.
   - Utilizes `PaginationState` and `buildPaginationUrl` from `./pagination`.
   - Formats localized display range and counts ("Showing X to Y of Z entries" / "نمایش X تا Y از Z مورد") with Persian digits when `locale === 'fa'`.
   - Renders daisyUI `join` group with `Prev`, numeric page buttons, ellipses, and `Next`.
   - Adds HTMX attributes (`hx-get`, `hx-target`, `hx-swap="outerHTML"`) to enable seamless AJAX table swaps without full page reload.
   - Accurately disables navigation buttons when `!hasPrev` or `!hasNext`.

2. **`src/modules/admin/views.tsx`**:
   - Imported `Pagination` and `type PaginationState`.
   - Extended `CrudTable` props to accept optional `pagination?: PaginationState`.
   - Rendered `<Pagination />` below the table inside `id={`${resource}-table`}` using `baseUrl={`/dashboard/admin/${resource}`}` and `targetId={`${resource}-table`}`.

## Verification
- Typecheck: `bun run check` passed with 0 errors.
- Test suite: `bun test` passed (180 tests across 36 files).

## Git Commit
- `9e94b88` `feat(admin): add reusable Pagination component to CrudTable`
