---
name: smart-commit
description: Analyzes git diffs, groups changes logically by feature/fix/test/doc/refactor, and outputs a single chained commit command matching repo style without co-authors.
---

Inspect current git status and diffs:
1. Run `git status -s` and `git diff` (including unstaged files).
2. Group files logically by concern (e.g. `feat(auth)`, `fix(ui)`, `test(db)`, `docs(readme)`).
3. Do NOT bundle unrelated changes together.
4. Match conventional commit format matching repo commit history (`<type>(<scope>): <description>`).
5. Output ONLY a single copy-pasteable bash command:
   `git add <files1> && git commit -m "<msg1>" && git add <files2> && git commit -m "<msg2>"`
6. No `Co-Authored-By` or extra trailers.
