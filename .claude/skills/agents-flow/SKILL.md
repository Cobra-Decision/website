---
name: agents-flow
description: Runs sequential multi-agent review pipeline: ui-reviewer, db-reviewer, security-reviewer, refactorer, and verifier.
---

# Sequential Agents Review Pipeline

Execute the following agents in exact sequence:

1. **`ui-reviewer`**: Audit UI components for HTMX attributes, Alpine.js scopes, daisyUI/Tailwind responsive styling, accessibility, and visual consistency.
2. **`db-reviewer`**: Audit SQLite schema changes, migrations, indexing, query parameterization, and WAL transaction safety.
3. **`security-reviewer`**: Audit code changes for security issues, auth guard coverage, SQL injection, ALTCHA verification, and JWT risks.
4. **`refactorer`**: Review code against best practices, DRY principles, component unification, memory efficiency, and clean architecture.
5. **`verifier`**: Run TypeScript type checking (`bun run check`), unit/integration tests (`bun test`), and CSS bundle builds (`bun run build:css`).

Summarize findings from each agent in a structured report.
