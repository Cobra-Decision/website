# Dashboard security and profile design

## Scope

- Standardize modal action rows so Cancel and Save/Delete align at the bottom right.
- Remove the broken admin "Back to app" link.
- Rename the product to Cobra Decision across dashboard navigation and user-facing labels.
- Show role titles in user tables; continue storing `role_id` internally.
- Store meet scheduling instants as UTC and render/input them in Asia/Tehran using the Persian (Shamsi) calendar.
- Keep admin password edits as plaintext form input, hash only on the server, and never return password hashes.
- Require password confirmation during registration.
- Add an authenticated profile page where a user can edit their own optional profile fields and change password with confirmation.
- Replace report pages with one Super-Admin-only SQL report page showing the schema and returning query results.

## Security model

- Every existing protected route remains session-validated and role-authorized.
- `/dashboard/admin/report` requires the `Super Admin` role in addition to its endpoint permission.
- Report SQL accepts one statement only, starting with `SELECT` or `WITH`; comments and write/DDL/transaction/attachment keywords are rejected, and a server-side row limit is applied.
- Profile updates identify the user from the verified JWT, never a submitted user ID.
- Admin user passwords and registration passwords are hashed with `Bun.password.hash`; no hash is rendered in a form or table.

## Data and UI

- Meet scheduling migrates from separate date/time fields to a UTC timestamp while retaining compatibility with existing values during migration. Tehran display uses `Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran' })`.
- The registration, profile, and admin password flows use matching confirmation fields validated server-side.
- Relation fields remain daisyUI selects: role, presenter, tags, and attendees.
- Meet editing supports adding and removing tags and attendees through the existing junction tables; the saved selections replace the current mappings atomically.
- Role editing includes an endpoint-mapping section: choose valid endpoints from a styled select, inspect existing mappings, and remove mappings. The seeded Super Admin mappings remain protected.
- All selects use the same daisyUI `select select-bordered w-full` treatment as other form controls.
- Meet image URLs show a small preview in the edit form when present.
- Tag badges expose their description in a small hover-only daisyUI tooltip.
- Every successful or rejected mutation returns a cached error-dictionary message as an HTMX out-of-band toast. The layout retains one `#toast-container` and the route returns an OOB toast without replacing the requested table/modal target.

## Verification

- Tests cover password confirmation, self-profile isolation and password hashing, Super Admin report access, report query rejection for writes/multiple statements, and UTC-to-Tehran display conversion.
- Tests cover relation replacement for meet tags/attendees, protected Super Admin endpoint mappings, toast OOB response markup, image preview markup, and tag-description tooltips.
