# Form and Seed Reliability Design

## Goal

Make every application form produce a useful HTMX response on success and failure, make sample data a complete and repeatable representation of the database, and apply static CobraDecision document branding.

## Commands

- `bun run seed` initializes and seeds the configured SQLite database.
- `bun test` uses temporary in-memory databases and verifies seed and form behavior without touching application data.
- `bun run check` remains a read-only TypeScript check and never changes a database.

## Complete Seed Data

The existing initialization and sample seed functions remain the single entry points. Seeding is idempotent and preserves unrelated existing rows. It creates valid connected records for every application table:

- roles: member, admin, and Super Admin;
- users: a configured Super Admin plus representative admin and member accounts using `Bun.password.hash`;
- endpoints and role_endpoints: all active dashboard resources with appropriate role access;
- tags: realistic titles and descriptions;
- meets: descriptions, JSON topics, UTC schedules, local display fields, durations, URLs, images, and presenters;
- meet_tags and meet_attendees: valid many-to-many mappings;
- contact_requests: representative contact rows;
- error_messages: active success, error, warning, and info messages used by form routes.

No seed uses invalid foreign keys, plaintext password storage, duplicate active unique values, or destructive replacement.

## Form Responses

All POST and DELETE form routes are audited. Successful requests update SQLite and return the HTMX fragment expected by the form target. Invalid requests return status 400 or the appropriate authorization status while keeping the relevant form or modal usable.

Admin CRUD forms share one validation/error response pattern. A failed modal submission returns the populated modal with a visible form-level error and an out-of-band error toast. Relationship editors return their existing panel plus an error toast. Public authentication, profile, contact, role-endpoint, SQL report, bulk action, and logout forms retain their specific response targets but follow the same visible-error rule.

Database exception text is never exposed directly. Routes translate uniqueness, required-field, invalid identifier, and foreign-key failures into concise user-facing messages.

## Shared UI

A small shared form-error component renders consistent daisyUI error markup. The existing shared Toast component remains the single out-of-band notification renderer. Forms use native HTML constraints for immediate browser feedback and server validation as the source of truth.

All documents use the static title `CobraDecision`. The layout references a simple local sample favicon that can be replaced later without changing application code.

## Tests

Integration tests submit every form route with representative valid and invalid data. Assertions cover HTTP status, HTMX redirect or fragment contract, visible error/toast markup, and resulting database state.

Seed tests run the complete seed twice and verify:

- every table contains expected active rows;
- relationships point to valid active records;
- sample passwords are native hashes and verify correctly;
- UTC meet schedules and required descriptions are populated;
- rerunning the seed does not duplicate rows.

The full test suite, TypeScript check, CSS build, and diff validation must pass before completion.
