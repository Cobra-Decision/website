# Spec: Unified UI Kit - Badge Primitive & View Migration

**Date:** 2026-09-30  
**Status:** Validated & Reviewed (Pass 1 & Pass 2)  
**Target:** Standardize and unify all badges across the CobraDecision server-rendered JSX + HTMX stack using a shared `<Badge />` primitive in `src/ui/forms/badge.tsx`, while retaining domain-specific components (`MeetStatusBadge`, `MeetAccessBadge`, `MeetPublishBadge`, `TagBadge`) refactored internally to use the unified primitive.

---

## 1. Problem Statement & Motivation

### Current Issues:
1. **Raw & Scattered Badge Markup**: Badges (`<span class="badge ...">`, `<div class="badge ...">`, `<button type="button" class="badge ...">`, `<label class="badge ...">`) are manually created across multiple modules (`about-views.tsx`, `database-views.tsx`, `platforms-views.tsx`, `report-views.tsx`, `mail-scheduler-views.tsx`, `mailer-views.tsx`, `mail-editor-views.tsx`, `mail-placeholders-component.tsx`, `dashboard.tsx`, `events/views.tsx`, `account/views.tsx`, `user/views.tsx`, `public-header.tsx`, `routes.tsx`, `tag-selector.tsx`, `meet-card.tsx`).
2. **Inconsistent Class Composition & Sizing**: Sizing varies (`badge-xs`, `badge-sm`, `badge-md`, `badge-lg`), some with `font-mono`, `text-xs`, `font-semibold`, uppercase, or manual gap classes.
3. **Duplicated Logic in Domain Badges**: `MeetStatusBadge`, `MeetAccessBadge`, `MeetPublishBadge` in `src/ui/meet-badges.tsx` and `TagBadge` in `src/ui/tag-badge.tsx` duplicate size calculations and manual `class="badge ..."` construction.
4. **Maintenance Overhead**: Changing badge border styling, contrast, or focus/hover styles requires touching dozens of raw HTML tags.

### Objectives:
- Provide a **zero-runtime-cost, server-side JSX `<Badge />` primitive** in `src/ui/forms/badge.tsx` (re-exported via `src/ui/forms/index.ts`).
- Support polymorphic rendering via `as?: "span" | "div" | "button" | "label" | "a"` (defaulting to `"span"`).
- Ensure **100% native HTML / HTMX / Alpine.js compatibility** via prop forwarding (`...props`).
- Support sizes (`xs`, `sm`, `md`, `lg`), color variants (`primary`, `secondary`, `accent`, `neutral`, `ghost`, `error`, `success`, `warning`, `info`), `outline` boolean modifier, icons (`icon`, `iconRight`), and custom classes.
- Refactor all existing raw badge tags and domain-specific badge wrappers to use `<Badge />`.

---

## 2. Complete Inventory of Badge Elements to Replace

Below is the exhaustive audit table of every raw badge element in the codebase:

| # | File Path | Current Element / Line | Target Replacement |
| :--- | :--- | :--- | :--- |
| 1 | `src/modules/landing/about-views.tsx` (line 74) | `<div class="badge badge-primary badge-sm mb-4 font-bold">` | `<Badge as="div" variant="primary" size="sm" class="mb-4 font-bold">` |
| 2 | `src/modules/landing/about-views.tsx` (line 86) | `<div class="badge badge-secondary badge-sm mb-4 font-bold">` | `<Badge as="div" variant="secondary" size="sm" class="mb-4 font-bold">` |
| 3 | `src/modules/landing/about-views.tsx` (line 151) | `<span class="badge badge-primary badge-sm font-semibold mb-3">` | `<Badge variant="primary" size="sm" class="font-semibold mb-3">` |
| 4 | `src/modules/landing/about-views.tsx` (line 158) | `<span class="badge badge-secondary badge-sm font-semibold mb-3">` | `<Badge variant="secondary" size="sm" class="font-semibold mb-3">` |
| 5 | `src/modules/admin/database-views.tsx` (line 115) | `<span class="badge badge-success badge-xs font-mono">` | `<Badge variant="success" size="xs" class="font-mono">` |
| 6 | `src/modules/admin/database-views.tsx` (line 172) | `<span class="badge badge-neutral badge-sm font-mono">` | `<Badge variant="neutral" size="sm" class="font-mono">` |
| 7 | `src/modules/admin/database-views.tsx` (line 235) | `<span class={stats.ftpConfigured ? "badge badge-success badge-sm" : "badge badge-ghost badge-sm"}>` | `<Badge variant={stats.ftpConfigured ? "success" : "ghost"} size="sm">` |
| 8 | `src/modules/dashboard/user/views.tsx` (line 26) | `<span class="badge badge-ghost text-xs py-2 px-3">` | `<Badge variant="ghost" size="sm" class="py-2 px-3">` |
| 9 | `src/modules/admin/routes.tsx` (line 614) | `<span class="badge badge-sm badge-outline">` | `<Badge outline size="sm">` |
| 10 | `src/ui/dashboard.tsx` (line 63) | `<span class="badge badge-sm badge-outline">` | `<Badge outline size="sm">` |
| 11 | `src/ui/dashboard.tsx` (line 150) | `<span class="text-xs badge badge-ghost font-mono">` | `<Badge variant="ghost" size="xs" class="font-mono">` |
| 12 | `src/modules/admin/views.tsx` (lines 188-189) | Status formatter `<span class={`badge ${badgeColor} badge-sm font-medium`}>` | `<Badge variant={...} size="sm" class="font-medium">` |
| 13 | `src/modules/admin/views.tsx` (lines 193-199) | Publish status formatter `<span class={`badge ${badgeColor} badge-sm font-medium`}>` | `<Badge variant={...} outline={...} size="sm" class="font-medium">` |
| 14 | `src/modules/admin/views.tsx` (lines 203-204) | Access status formatter `<span class={`badge ${badgeColor} badge-sm font-medium`}>` | `<Badge variant={...} outline={...} size="sm" class="font-medium">` |
| 15 | `src/ui/public-header.tsx` (line 138) | `<span class="badge badge-primary badge-xs" aria-hidden="true"></span>` | `<Badge variant="primary" size="xs" aria-hidden="true" />` |
| 16 | `src/modules/admin/mail-scheduler-views.tsx` (line 40) | `<span class="badge badge-outline badge-xs font-mono uppercase tracking-wider font-semibold">` | `<Badge outline size="xs" class="font-mono uppercase tracking-wider font-semibold">` |
| 17 | `src/modules/admin/mail-scheduler-views.tsx` (lines 44-52) | Active/disabled rule badge `<span class={`badge badge-xs font-semibold gap-1 ...`}>` | `<Badge variant={isEnabled ? "success" : "ghost"} size="xs" class="font-semibold gap-1 ...">` |
| 18 | `src/modules/admin/mail-scheduler-views.tsx` (line 679) | `<span class="badge badge-xs badge-outline uppercase font-mono" x-text="format"></span>` | `<Badge outline size="xs" class="uppercase font-mono" x-text="format" />` |
| 19 | `src/modules/admin/mail-scheduler-views.tsx` (lines 735-744) | Execution log status badge | `<Badge variant={statusVariant} size="sm" class="...">` |
| 20 | `src/modules/admin/mail-scheduler-views.tsx` (line 755) | `<span class="badge badge-outline badge-xs uppercase font-mono">` | `<Badge outline size="xs" class="uppercase font-mono">` |
| 21 | `src/modules/admin/mail-scheduler-views.tsx` (line 760) | `<span class="badge badge-ghost badge-xs uppercase font-mono">{job.format}</span>` | `<Badge variant="ghost" size="xs" class="uppercase font-mono">` |
| 22 | `src/modules/dashboard/account/views.tsx` (line 118) | `<span class="badge badge-sm badge-outline">` | `<Badge outline size="sm">` |
| 23 | `src/modules/admin/platforms-views.tsx` (line 220) | `<span class="badge badge-primary badge-xs">1</span>` | `<Badge variant="primary" size="xs">1</Badge>` |
| 24 | `src/modules/admin/platforms-views.tsx` (line 236) | `<span class="badge badge-success badge-xs">2</span>` | `<Badge variant="success" size="xs">2</Badge>` |
| 25 | `src/modules/admin/platforms-views.tsx` (line 279) | `<span class={`badge badge-sm ${p.slug ? "badge-info badge-outline" : "badge-ghost"}`}>` | `<Badge variant={p.slug ? "info" : "ghost"} outline={Boolean(p.slug)} size="sm">` |
| 26 | `src/modules/admin/platforms-views.tsx` (line 389) | `<span class="badge badge-sm badge-ghost">` | `<Badge variant="ghost" size="sm">` |
| 27 | `src/modules/events/views.tsx` (lines 254-256) | `<span class="badge badge-neutral font-medium">`, `<span class="badge badge-outline">`, `<span class="badge badge-ghost">` | `<Badge variant="neutral" class="font-medium">`, `<Badge outline>`, `<Badge variant="ghost">` |
| 28 | `src/modules/admin/mail-editor-views.tsx` (line 163) | `<span class="badge badge-ghost badge-xs uppercase font-mono">` | `<Badge variant="ghost" size="xs" class="uppercase font-mono">` |
| 29 | `src/modules/admin/mail-editor-views.tsx` (line 339) | `<span class="badge badge-sm badge-ghost font-mono text-2xs" x-text="format"></span>` | `<Badge variant="ghost" size="sm" class="font-mono text-2xs" x-text="format" />` |
| 30 | `src/modules/admin/mail-placeholders-component.tsx` (line 48) | `<button type="button" class="badge badge-sm badge-outline hover:badge-primary font-mono text-2xs cursor-pointer transition">` | `<Badge as="button" type="button" outline size="sm" class="hover:badge-primary font-mono text-2xs cursor-pointer transition">` |
| 31 | `src/modules/admin/mailer-views.tsx` (line 375) | `<span class="badge badge-xs badge-ghost font-mono uppercase" x-text="format"></span>` | `<Badge variant="ghost" size="xs" class="font-mono uppercase" x-text="format" />` |
| 32 | `src/modules/admin/mailer-views.tsx` (lines 427-432) | Broadcast status badge | `<Badge variant={statusVariant} size="sm" class="...">` |
| 33 | `src/modules/admin/mailer-views.tsx` (line 441) | `<span class="badge badge-ghost badge-xs">` | `<Badge variant="ghost" size="xs">` |
| 34 | `src/modules/admin/report-views.tsx` (line 98) | `<span class="badge badge-error badge-xs font-semibold">NOT NULL</span>` | `<Badge variant="error" size="xs" class="font-semibold">NOT NULL</Badge>` |
| 35 | `src/modules/admin/report-views.tsx` (line 100) | `<span class="badge badge-primary badge-xs font-semibold">` | `<Badge variant="primary" size="xs" class="font-semibold">` |
| 36 | `src/ui/tag-selector.tsx` (line 46) | Counter `<span class="badge badge-sm font-medium transition-colors shrink-0 whitespace-nowrap" x-bind:class="...">` | `<Badge size="sm" class="font-medium transition-colors shrink-0 whitespace-nowrap" x-bind:class="...">` |
| 37 | `src/ui/tag-selector.tsx` (line 86) | Tag option `<label class="badge badge-lg gap-1.5 cursor-pointer select-none py-3 px-3.5 transition-all text-xs font-medium border" x-bind:class="...">` | `<Badge as="label" size="lg" class="gap-1.5 cursor-pointer select-none py-3 px-3.5 transition-all text-xs font-medium border" x-bind:class="...">` |
| 38 | `src/ui/meet-card.tsx` (line 77) | Date overlay `<div class="badge absolute start-3 top-3 border-0 bg-base-100/90 text-xs font-medium text-base-content backdrop-blur-sm z-20">` | `<Badge as="div" class="absolute start-3 top-3 border-0 bg-base-100/90 text-xs font-medium text-base-content backdrop-blur-sm z-20">` |
| 39 | `src/ui/meet-card.tsx` (line 80) | Status wrapper `<div class="badge absolute end-3 top-3 border-0 p-0 text-xs font-medium z-20">` | `<Badge as="div" class="absolute end-3 top-3 border-0 p-0 text-xs font-medium z-20">` |
| 40 | `src/ui/meet-badges.tsx` (lines 45, 68, 94) | `MeetStatusBadge`, `MeetAccessBadge`, `MeetPublishBadge` internal markup | Refactor internally to `<Badge />` primitive |
| 41 | `src/ui/tag-badge.tsx` (lines 20-60) | `TagBadge` internal markup | Refactor internally to `<Badge />` primitive |

---

## 3. Component Architecture & API Specification

### 3.1 Type Definitions (`src/ui/forms/types.ts`)
Add `BadgeVariant` to `src/ui/forms/types.ts`:
```typescript
export type BadgeVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "neutral"
  | "ghost"
  | "error"
  | "success"
  | "warning"
  | "info";
```

### 3.2 `<Badge />` (`src/ui/forms/badge.tsx`)
```typescript
import type { BadgeVariant, ComponentSize } from "./types";

export interface BadgeProps {
  as?: "span" | "div" | "button" | "label" | "a";
  variant?: BadgeVariant;
  size?: ComponentSize;
  outline?: boolean;
  icon?: any;
  iconRight?: any;
  class?: string;
  children?: any;
  [key: string]: any; // Full HTMX, Alpine, and HTML attribute forwarding
}

const sizeClasses: Record<ComponentSize, string> = {
  xs: "badge-xs",
  sm: "badge-sm",
  md: "badge-md",
  lg: "badge-lg",
};

const variantClasses: Record<BadgeVariant, string> = {
  primary: "badge-primary",
  secondary: "badge-secondary",
  accent: "badge-accent",
  neutral: "badge-neutral",
  ghost: "badge-ghost",
  error: "badge-error",
  success: "badge-success",
  warning: "badge-warning",
  info: "badge-info",
};

export function Badge({
  as: Tag = "span",
  variant,
  size,
  outline = false,
  icon,
  iconRight,
  class: customClass = "",
  children,
  ...props
}: BadgeProps) {
  const classes = [
    "badge",
    variant ? variantClasses[variant] : "",
    size ? sizeClasses[size] : "",
    outline ? "badge-outline" : "",
    customClass,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {icon && <span class="inline-flex shrink-0 me-1 items-center">{icon}</span>}
      {children}
      {iconRight && <span class="inline-flex shrink-0 ms-1 items-center">{iconRight}</span>}
    </>
  );

  return (
    <Tag class={classes} {...props}>
      {content}
    </Tag>
  );
}
```

---

## 4. Verification & Testing Strategy
1. **Unit Tests (`src/ui/forms/badge.test.ts`)**:
   - Render default `<Badge>Label</Badge>` → verify `<span class="badge">Label</span>`.
   - Render with polymorphic tags (`as="div"`, `as="button"`, `as="label"`, `as="a"`).
   - Render with color variants (`primary`, `success`, `error`, etc.) → verify `badge-primary`, etc.
   - Render with sizes (`xs`, `sm`, `md`, `lg`) → verify `badge-xs`, etc.
   - Render with `outline` boolean modifier → verify `badge-outline`.
   - Render with icons (`icon`, `iconRight`) → verify logical margins (`me-1`, `ms-1`).
   - Render with HTMX/Alpine attributes (`hx-get`, `x-text`, `x-bind:class`) → verify attribute forwarding.
2. **Typecheck & Regression Test Suite**:
   - `bun run check`
   - `bun test`
   - `bun run build:css`
