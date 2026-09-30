# Refactoring & Component Unification Guide

This guide defines the standardized refactoring workflow for the CobraDecision codebase. Any agent or engineer refactoring views, UI components, services, or routes must follow this structured methodology.

---

## 1. Architectural & Code Quality Principles

1. **Unified Components (No Ad-hoc / Raw Markup Duplication)**:
   - Always reuse and unify existing UI primitives (`src/ui/forms/`, `src/ui/`).
   - **Never create raw, ad-hoc HTML controls** (`<button>`, `<input>`, `<select>`, `<textarea>`, `<label class="form-control">`) when an existing primitive or component exists.
   - Only create a new component if the pattern does not exist anywhere in the codebase and is completely new.
2. **Clean Code, DRY & KISS**:
   - **DRY (Don't Repeat Yourself)**: Eliminate duplicate markup, styling, and business logic.
   - **KISS (Keep It Simple, Stupid)**: Favor minimal, boring, and readable implementations. Avoid speculative abstractions or premature layers.
   - **Clean Code**: Clear naming, consistent prop signatures, explicit types, and zero dead code.
3. **Zero Runtime Cost (Server-Side JSX)**:
   - UI primitives and components must be pure server-rendered JSX functions returning HTML elements.
   - Do not introduce client bundles or client hydration frameworks for static or server-driven views.
4. **Full Attribute Passthrough (`...props`)**:
   - Always spread `...props` directly onto native HTML elements (`<button>`, `<input>`, `<select>`, `<textarea>`) to allow seamless passthrough of HTMX (`hx-*`), Alpine.js (`x-*`), standard HTML5 attributes, and event handlers.
5. **daisyUI & Logical RTL/LTR Styling**:
   - Use standard daisyUI utility classes (`btn`, `input`, `select`, `textarea`, `checkbox`, `toggle`, `form-control`).
   - Use Tailwind CSS logical spacing (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `text-end`) for English and Persian typography (`Vazirmatn`).
6. **Security & Data Integrity**:
   - Never remove or bypass route auth guards (`authGuard`, `requirePermission`, `guard`).
   - Retain ALTCHA verification and rate limiting on public endpoints.
   - Retain parameterized SQL queries (`?` bindings) across all DB interactions.

---

## 2. Refactoring Workflow (Step-by-Step)

### Phase 1: Exhaustive R&D, Spec, & Dual-Pass Plan Review
1. **Comprehensive Codebase Audit (R&D First)**:
   - Search the entire repository for all occurrences of the elements, patterns, or views being refactored.
   - Build an **exhaustive, 100% accurate audit table** listing every single file, line, and element to replace. Recheck the list to ensure not a single occurrence is missed.
2. **Design Spec**: Create `docs/superpowers/specs/YYYY-MM-DD-<feature>-design.md`.
   - Include the full problem statement, motivation, and complete inventory table.
   - Define exact component interfaces (TypeScript props, HTML output, size/variant mappings).
3. **Implementation Plan**: Create `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`.
   - Break work into discrete, testable tasks with step-by-step checklists (`- [ ]`).
   - Detail files to create/modify, expected interfaces, failing unit tests, and verification commands.
4. **Dual-Pass Review (2 Separate Checks with Different Agents/Skills)**:
   - **Pass 1**: Dispatch a primary architectural review agent/skill (e.g. `refactorer` or software architect agent) to evaluate spec completeness, DRYness, and interface consistency. Refine spec/plan based on findings.
   - **Pass 2**: Dispatch a second, *distinct* reviewer agent/skill (e.g. `ui-reviewer`, `security-reviewer`, or `code-reviewer`—never the same agent/skill twice) to verify edge cases, HTMX/Alpine compatibility, security guards, and checklist accuracy.
5. **Handoff & Context Refresh**:
   - Once the spec, plan, and dual reviews are committed, notify the user that R&D and planning are finalized.
   - **Advise the user to run `/clear`** so implementation starts in a 100% clean, fresh context window.

---

### Phase 2: Execution via Subagent-Driven Development
Execute the plan using `superpowers:subagent-driven-development` in an isolated workspace:
1. **Isolated Workspace**: Work in a git worktree (`EnterWorktree` or `superpowers:using-git-worktrees`).
2. **Per-Task TDD & Subagents**:
   - Dispatch an **implementer subagent** for each task.
   - Write failing unit test first → implement changes → verify with `bun test <path>` and `bun run check`.
   - Commit changes per task with conventional commits (e.g. `feat(ui): ...`, `refactor(auth): ...`).
   - Dispatch a **task reviewer subagent** to verify spec compliance and code quality against the checklist before proceeding.
   - Recheck the task checklist after each step so no requirement or file is omitted.

---

### Phase 3: Whole-Branch Review & Integration
1. **Branch Review**: Dispatch a whole-branch code reviewer subagent over the full diff (`review-package BASE HEAD`).
2. **Merge**: Use `superpowers:finishing-a-development-branch` to verify the full suite (`bun test`), merge cleanly to `main`, and remove the worktree.

---

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
