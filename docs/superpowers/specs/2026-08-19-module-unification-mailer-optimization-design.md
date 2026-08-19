# Full Module Unification, Mailer Memory Optimization, & Seeding Refactor Design

## Context & Objectives
Refactor CobraDecision application modules into a standard unified pattern, eliminate memory overhead in email delivery/scheduling, synchronize all module schemas with central schema & seeders, and ensure zero regression across all test suites.

## 1. Unified Module Architecture Standard
Each module in `src/modules/<module-name>/` will follow a standard layout:
- `index.ts`: Public API export boundary for module
- `types.ts`: Module domain types and DTOs
- `schema.sql`: Exact module table DDL
- `database.ts`: Database queries, schema migrations, and seeding helpers
- `service.ts`: Core business logic
- `routes.tsx`: Hono web / API router
- `views.tsx`: JSX / UI views and templates

Modules to standardize:
1. `auth`
2. `events` (merge `queries.ts` into `database.ts` or export via unified database interface)
3. `mailer`
4. `landing`
5. `admin`
6. `dashboard` (export user/account views and routers cleanly)

## 2. Mailer Memory & Performance Optimization
1. **Cursor / Chunked Recipient Processing**:
   - `sendFavoriteTagMeetReminders`: Query recipients in stream/batch chunks (50 at a time) using LIMIT/OFFSET or id cursor to prevent memory spikes on large user bases.
2. **Buffer & Attachment Lifecycle**:
   - RingBuffer retains fixed lightweight metadata only (`EmailMessage`).
   - Binary attachments and heavy HTML bodies are dereferenced immediately once sent/failed.
3. **Scheduler Lifecycle & Timers**:
   - Explicit `startMailerScheduler` / `stopMailerScheduler` handles.
   - Use `.unref()` on scheduler `setInterval` so workers and tests cleanly shut down without open handles.

## 3. Database Schema & Seeding Synchronization
1. `src/lib/schema.sql` must contain the complete, consolidated schema matching all individual `src/modules/*/schema.sql` files (including `email_logs`, `email_templates`, `email_schedules`, etc.).
2. Synchronize `src/seed.ts` and `src/lib/seed.ts` with complete default permissions, roles, email templates, and sample data.

## 4. Testing & Environment Configuration
1. `.env.example`: Ensure all variables are fully documented (`DATABASE_PATH`, `MEET_REMINDER_DAYS_BEFORE`, `MAILER_SCHEDULER_INTERVAL_MS`, `STORAGE_DIR`, etc.).
2. Run full test suite (`bun test`) and TypeScript typecheck (`bun run check`).
