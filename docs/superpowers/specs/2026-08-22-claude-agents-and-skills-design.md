# Specification: Claude Code Context, Agents, and Skills Architecture

- **Date**: 2026-08-22
- **Topic**: Repository-specific Claude Code integration (CLAUDE.md, agents, skills, commit tool)

---

## 1. Overview
Set up a modular, maintainable Claude Code configuration in the repository:
1. `CLAUDE.md`: Main repo context, stack definitions, constraints, and standard commands.
2. Custom agent definitions under `.claude/agents/`:
   - `verifier`: Executes `bun run typecheck`, `bun test`, `bun run build:css`.
   - `security-reviewer`: Audits diffs for authorization bypasses, SQL injection, ALTCHA, and JWT logic.
   - `ui-reviewer`: Verifies HTMX swap flows, Alpine.js reactive state, daisyUI/Tailwind responsive UI.
   - `db-reviewer`: Validates SQLite migrations, indexes, transaction boundaries, and WAL compatibility.
   - `refactorer`: Evaluates unified components, DRY principles, memory efficiency, and clean code structure.
3. Custom skills under `.claude/skills/`:
   - `smart-commit`: Analyzes git diffs/unstaged files, groups by feature/concern, matches commit history style (`feat(scope): msg`), outputs a single chained bash command without co-author tags.
   - `post-change`: Coordinates verification, security, UI, and DB review agents after edits.
   - `refactor`: Runs refactorer agent on specified paths or modified diffs.

---

## 2. Component Specifications

### 2.1 `CLAUDE.md`
- **Architecture**: Modular monolith with Bun, Hono, JSX server-rendering, HTMX, Alpine.js, Tailwind CSS + daisyUI, SQLite (WAL mode).
- **Core Commands**:
  - `bun test`
  - `bun run check`
  - `bun run build:css`
  - `bun run migrate`
  - `bun run seed`
  - `bun run dev`
- **Rules**:
  - Zero redundant abstractions.
  - Native platform & standard library first.
  - Strict auth guards & input validation at boundaries.
  - Responsive, mobile-first, and RTL-aware UI components.

### 2.2 Agents (`.claude/agents/*.md`)
- Format: YAML frontmatter (`name`, `description`, `tools`, `model`) + Markdown prompt instructions.
- Target agents: `verifier`, `security-reviewer`, `ui-reviewer`, `db-reviewer`, `refactorer`.

### 2.3 Skills (`.claude/skills/*/*.md`)
- `smart-commit`:
  - Analyzes unstaged & staged diffs via git.
  - Groups related changes into atomic feature/fix/test/doc/refactor commits.
  - Outputs a copy-pasteable single-line bash command (`git add ... && git commit -m "..."`).
  - No `Co-Authored-By` trailers.
- `post-change`:
  - Triggers test & type check runner.
  - Dispatches targeted reviews based on touched file extensions (`.tsx`, `.ts`, migrations, CSS).
- `refactor`:
  - Evaluates components and services for code unification, DRY, memory efficiency, and standard best practices.

---

## 3. Verification & Acceptance Criteria
- Files written in `.claude/agents/`, `.claude/skills/`, and `CLAUDE.md`.
- Skills and agent files conform to Claude Code standards.
- `bun run check` and `bun test` remain unaffected and passing.
