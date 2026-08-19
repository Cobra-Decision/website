# Module Unification, Mailer Memory Optimization, & Seeding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify all module structures across the project, optimize mailer memory efficiency, synchronize schemas/seeding, and update environment documentation and tests.

**Architecture:** Standardize each module (`auth`, `events`, `mailer`, `landing`, `admin`, `dashboard`) to provide consistent `index.ts`, `types.ts`, `database.ts`, `service.ts`, `routes.tsx`, `views.tsx`, and `schema.sql`. Optimize email scheduler and batch sending with chunked stream queries, timer cleanup, and rapid buffer dereferencing.

**Tech Stack:** Bun, TypeScript, Hono, SQLite (`bun:sqlite`), Tailwind CSS, JSX.

**Spec:** `docs/superpowers/specs/2026-08-19-module-unification-mailer-optimization-design.md`

## Global Constraints
- All 100+ existing tests must pass (`bun test`).
- TypeScript strict typecheck must pass without error (`bunx tsc --noEmit`).
- No breaking changes to existing routes or view components.

---

### Task 1: Unify Modules with Root `index.ts` and Standard Files

**Files:**
- Create: `src/modules/auth/index.ts`
- Create: `src/modules/events/index.ts`
- Create: `src/modules/mailer/index.ts`
- Create: `src/modules/landing/index.ts`
- Create: `src/modules/admin/index.ts`
- Create: `src/modules/dashboard/index.ts`
- Modify: `src/modules/events/database.ts` (re-export queries for backward compatibility)
- Modify: `src/index.tsx` (import unified module initializers)

- [ ] **Step 1: Create module `index.ts` entrypoints**
- [ ] **Step 2: Verify imports across `src/index.tsx` and `src/app.tsx`**
- [ ] **Step 3: Run `bun test` and verify clean build**

---

### Task 2: Optimize Mailer Memory & Scheduler Efficiency

**Files:**
- Modify: `src/modules/mailer/service.ts`
- Modify: `src/modules/mailer/scheduler.ts`
- Test: `test/email-scheduler.test.ts`
- Test: `test/mailer.service.test.ts`

- [ ] **Step 1: Implement chunked batch processing in `service.ts` for reminder queries**
- [ ] **Step 2: Ensure unref() timer handling and cleanup in `scheduler.ts`**
- [ ] **Step 3: Test mailer service & scheduler memory and batch handling**

---

### Task 3: Synchronize Central and Module Schemas & Seeding

**Files:**
- Modify: `src/lib/schema.sql`
- Modify: `src/modules/mailer/schema.sql`
- Modify: `src/lib/seed.ts`
- Modify: `src/seed.ts`

- [ ] **Step 1: Ensure all module tables exist in central `src/lib/schema.sql`**
- [ ] **Step 2: Sync email templates and permissions in seeding routines**
- [ ] **Step 3: Run `bun run seed` or tests to verify clean execution**

---

### Task 4: Synchronize Environment Variables and Documentation

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add missing configuration variables in `.env.example`**
- [ ] **Step 2: Run full verification suite (`bun test && bun run check`)**
