# Refactoring & Component Unification Guide

This guide defines the standardized refactoring workflow for the CobraDecision codebase. Any agent or engineer refactoring views, UI components, services, or routes must follow this structured methodology.

---

## 1. Architectural Principles

1. **Zero Runtime Cost (Server-Side JSX)**:
   - UI primitives and components must be pure server-rendered JSX functions returning HTML elements.
   - Do not introduce client bundles or client hydration frameworks for static or server-driven views.
2. **Full Attribute Passthrough (`...props`)**:
   - Always spread `...props` directly onto native HTML elements (`<button>`, `<input>`, `<select>`, `<textarea>`) to allow seamless passthrough of HTMX (`hx-*`), Alpine.js (`x-*`), standard HTML5 attributes, and event handlers.
3. **daisyUI & Logical RTL/LTR Styling**:
   - Use standard daisyUI utility classes (`btn`, `input`, `select`, `textarea`, `checkbox`, `toggle`, `form-control`).
   - Use Tailwind CSS logical spacing (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `text-end`) for English and Persian typography (`Vazirmatn`).
4. **Security & Data Integrity**:
   - Never remove or bypass route auth guards (`authGuard`, `requirePermission`, `guard`).
   - Retain ALTCHA verification and rate limiting on public endpoints.
   - Retain parameterized SQL queries (`?` bindings) across all DB interactions.

---

## 2. Refactoring Workflow (Step-by-Step)

### Phase 1: Specification & Planning
Before modifying code:
1. **Design Spec**: Create `docs/superpowers/specs/YYYY-MM-DD-<feature>-design.md`.
   - Document problem statement, motivation, and an audit table of all elements/files to replace.
   - Define exact component interfaces (TypeScript props, HTML output, size/variant mappings).
2. **Implementation Plan**: Create `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`.
   - Break work into discrete, testable tasks (e.g. primitives creation → module-by-module view migration).
   - Detail files to create/modify, expected interfaces, failing unit tests, and verification commands.

### Phase 2: Execution via Subagent-Driven Development
Execute the plan using `superpowers:subagent-driven-development` in an isolated workspace:
1. **Isolated Workspace**: Work in a git worktree (`EnterWorktree` or `superpowers:using-git-worktrees`).
2. **Per-Task TDD & Subagents**:
   - Dispatch an **implementer subagent** for each task.
   - Write failing unit test first → implement changes → verify with `bun test <path>` and `bun run check`.
   - Commit changes per task with conventional commits (e.g. `feat(ui): ...`, `refactor(auth): ...`).
   - Dispatch a **task reviewer subagent** to verify spec compliance and code quality before proceeding.

### Phase 3: Whole-Branch Review & Integration
1. **Branch Review**: Dispatch a whole-branch code reviewer subagent over the full diff (`review-package BASE HEAD`).
2. **Merge**: Use `superpowers:finishing-a-development-branch` to verify the full suite (`bun test`), merge cleanly to `main`, and remove the worktree.

### Phase 4: Post-Change Verification Pipeline
Always run the `/post-change` skill on `main`:
1. **Verifier**:
   ```bash
   bun run check && bun test && bun run build:css
   ```
2. **Domain Reviewers**:
   - `ui-reviewer`: Audits HTMX attributes, Alpine scopes, daisyUI responsive/RTL classes, and accessibility.
   - `security-reviewer`: Audits auth guards, SQL parameters, ALTCHA challenge handling, and XSS escaping.
   - `db-reviewer` (if applicable): Audits migrations, WAL settings, and schema changes.

---

## 3. Quick Reference Commands

```bash
# Typecheck
bun run check

# Full Test Suite
bun test

# CSS Build
bun run build:css

# Run specific module tests
bun test src/ui/forms/
bun test src/modules/auth/
bun test src/modules/admin/
```
