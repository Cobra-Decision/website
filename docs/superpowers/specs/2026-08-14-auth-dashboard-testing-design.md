# Auth Dashboard and Testing Design

## Goal

Make authentication usable and test-driven: polished shared UI, visible ALTCHA, email-first registration, redirects, an authenticated dashboard, and repeatable database seeds.

## Design

- One shared HTML layout loads Tailwind, daisyUI, HTMX, Alpine, and ALTCHA for every page.
- Registration requires only email and password. Username, phone, first name, and last name are nullable; blank values are stored as null.
- Successful registration redirects to `/auth`; successful login redirects to `/dashboard`.
- A valid session can access `/dashboard`, which shows user information and a logout button in a navbar.
- Database initialization applies the schema and idempotently seeds `member`, `admin`, `/dashboard`, its admin permission, and an optional admin user from environment values.
- Tests use in-memory SQLite databases and injected CAPTCHA middleware so they never mutate `app.sqlite` or bypass CAPTCHA in production.

## Test Contracts

- Unit: registration validation and permission cache behavior.
- Database: schema constraints, foreign keys, soft-delete-aware queries, idempotent roles/endpoints/permissions, and optional admin seed.
- Integration: auth pages contain the UI stack and ALTCHA; registration/login redirects; dashboard session behavior; logout clears the cookie.
