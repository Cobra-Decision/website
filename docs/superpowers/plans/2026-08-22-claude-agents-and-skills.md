# Implementation Plan: Claude Context, Agents, and Skills

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide repository-wide context (`CLAUDE.md`), custom subagents for verification/reviews/refactoring, and custom skills for smart commits and post-change automation.

**Architecture:** Standard Markdown files in repository root (`CLAUDE.md`), `.claude/agents/*.md` for custom subagents, and `.claude/skills/*/*.md` for custom skills.

**Tech Stack:** Claude Code configuration format (YAML frontmatter + Markdown).

**Spec:** `docs/superpowers/specs/2026-08-22-claude-agents-and-skills-design.md`

## Global Constraints

- Follow exact Claude Code conventions for agents and skills.
- Conventional commit message format (`feat(scope): msg`, `fix(scope): msg`, etc.) matching repo commit history.
- No `Co-Authored-By` trailers in commit generation commands.

---

### Task 1: Create `CLAUDE.md`

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Write `CLAUDE.md`**

```markdown
# CobraDecision - System & Architecture Guidelines

High-performance, memory-efficient modular monolith built with **Bun**, **Hono**, server-rendered **JSX**, **HTMX**, **Tailwind CSS + daisyUI**, **Alpine.js**, **SQLite (WAL)**, **ALTCHA**, and **JWT**.

---

## 🛠️ Core Commands

```bash
# Typecheck
bun run check

# Tests
bun test

# CSS Build
bun run build:css

# Migrations & Seeding
bun run migrate
bun run seed

# Local Dev Server
bun run dev
```

---

## 🏛️ Architecture & Best Practices

1. **Modular Monolith**:
   - Organize code logically by domain (`src/routes/`, `src/services/`, `src/ui/`, `src/db/`, `src/middleware/`).
   - Unified components: avoid duplicate UI blocks. Keep markup DRY.

2. **Server-Side Rendered JSX & HTMX**:
   - Return clean HTML/JSX snippets on `hx-*` requests.
   - Use Alpine.js for localized client-side interactivity; avoid heavy client libraries.

3. **Memory & Performance**:
   - SQLite runs in WAL mode with fast parameterized queries (`db.query(...)`).
   - Use streams or paginated batches for large datasets. Avoid loading unbounded query results into RAM.

4. **Security**:
   - Strict granular auth guards on routes.
   - Use ALTCHA verification on public submission forms.
   - All database queries must use prepared statements/parameters to prevent SQL injection.
   - Never expose JWT secrets or HMAC keys to client-side code.

5. **UI & Accessibility**:
   - Mobile-first, responsive daisyUI and Tailwind classes.
   - Support RTL and Persian typography (`Vazirmatn` font).
```

- [ ] **Step 2: Verify `CLAUDE.md` content**

Check file is created at root and formatted cleanly.

---

### Task 2: Create Subagents in `.claude/agents/`

**Files:**
- Create: `.claude/agents/verifier.md`
- Create: `.claude/agents/security-reviewer.md`
- Create: `.claude/agents/ui-reviewer.md`
- Create: `.claude/agents/db-reviewer.md`
- Create: `.claude/agents/refactorer.md`

- [ ] **Step 1: Create `verifier.md`**
Agent for running tests, typechecks, and CSS build.

- [ ] **Step 2: Create `security-reviewer.md`**
Agent for auditing diffs for authorization bypass, SQL injection, ALTCHA, and JWT logic.

- [ ] **Step 3: Create `ui-reviewer.md`**
Agent for verifying HTMX attributes, Alpine.js scopes, and responsive Tailwind/daisyUI layouts.

- [ ] **Step 4: Create `db-reviewer.md`**
Agent for verifying SQLite migrations, indexes, transaction boundaries, and WAL compatibility.

- [ ] **Step 5: Create `refactorer.md`**
Agent for replanning and optimizing code for DRY, component unification, memory efficiency, and clean code standards.

---

### Task 3: Create Skills in `.claude/skills/`

**Files:**
- Create: `.claude/skills/smart-commit/SKILL.md`
- Create: `.claude/skills/post-change/SKILL.md`
- Create: `.claude/skills/refactor/SKILL.md`

- [ ] **Step 1: Create `smart-commit/SKILL.md`**
Reads git diff/status, groups changes by feature/fix/test/doc/refactor, generates conventional commit messages matching repo style, outputs a single chained bash command (`git add ... && git commit -m "..."`), without co-author trailers.

- [ ] **Step 2: Create `post-change/SKILL.md`**
Pipeline to verify types, tests, and run targeted agent reviews after changes.

- [ ] **Step 3: Create `refactor/SKILL.md`**
Invokes the `refactorer` agent on targeted paths or changes.

---

### Task 4: Self-Verification
- [ ] **Step 1: Run typecheck and tests**
Run: `bun run check && bun test`
Expected: PASS
