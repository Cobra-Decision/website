---
name: unified-timezone-architecture
description: Single source of truth UTC architecture and ingress/egress timezone boundary rules
metadata:
  type: project
---

The platform uses a single source of truth for date and time handling:
- **Storage:** All database date/time columns store canonical UTC ISO 8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ` or `CURRENT_TIMESTAMP`).
- **Ingress (`toUtcIso`):** User inputs `(date, time, timezone)` are converted to UTC ISO at ingress before storing in the database.
- **Egress (`formatUtcDateTime`):** Stored UTC timestamps are converted to the viewer's resolved timezone and locale at egress.
- **Context Timezone:** Resolved hierarchically: `user.timezone` -> `HX-Timezone` header -> `tz` cookie -> `"Asia/Tehran"` fallback.
- **Reference Spec:** `docs/superpowers/specs/2026-10-04-unified-timezone-architecture-design.md`
- **Implementation Plan:** `docs/superpowers/plans/2026-10-04-unified-timezone-architecture.md`
