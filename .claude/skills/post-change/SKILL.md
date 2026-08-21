---
name: post-change
description: Runs verification pipeline (types, tests, css) and targeted reviews after changes.
---

Post-change pipeline:
1. Run verifier: `bun run check && bun test && bun run build:css`.
2. Inspect changed files via `git status -s`.
3. If routes or auth changed, invoke `security-reviewer`.
4. If UI / JSX / CSS changed, invoke `ui-reviewer`.
5. If DB schema or queries changed, invoke `db-reviewer`.
6. Summarize verification and review results.
