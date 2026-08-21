# Feature Roadmap & Backlog Ideas

Collection of future feature proposals, architecture impact assessments, and lean implementation notes.

---

## 1. Unified Admin Calendar & Markdown Notebook

### Overview
- **Unified Admin Calendar**: Central schedule view in admin dashboard for events, meetings, and deadlines.
- **Admin Markdown Notebook**: Multi-note keeper supporting Markdown syntax for admins.

### Resource Impact (Bun + Hono + SQLite)
- **Memory (RAM)**:
  - Idle: +0 MB (shares existing Bun runtime & SQLite pool).
  - Active: +1–3 MB peak during active render/save requests.
  - Disk/Cache: Few KB per note/event record in SQLite.
- **CPU Usage**:
  - Idle: 0% (no background polling/timers needed).
  - Calendar query & SSR render: < 1 ms (`WHERE date BETWEEN ? AND ?`).
  - Markdown parse: < 2 ms on save (parse on write, store HTML + markdown, 0 ms cost on read).

### Recommended Implementation (Lean / Ponytail)
1. **Unified Calendar**:
   - Native CSS grid or simple HTML table rendered on server via JSX.
   - HTMX (`hx-get`, `hx-target`) for month navigation and day filtering.
   - SQLite table: `events` (`id`, `user_id`, `title`, `start_date`, `end_date`, `category`, `created_at`).
2. **Markdown Notebook**:
   - SQLite table: `notes` (`id`, `user_id`, `title`, `content_md`, `content_html`, `created_at`, `updated_at`).
   - Lightweight parser (`marked`) ran only on save; store pre-rendered `content_html` alongside raw markdown.
   - Native `<textarea>` + Alpine.js preview toggle (no heavy editor dependency).

### Skipped (and when to add)
- **Skipped**: Heavy client-side calendar bundles (e.g. FullCalendar) and complex WYSIWYG editors.
- **Add when**: Drag-and-drop event rescheduling or real-time collaborative rich-text editing becomes a strict requirement.

---
