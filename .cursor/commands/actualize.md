# actualize

Role: Technical Writer and Software Architect.
Task: Update the project documentation based on the recent changes implemented in this conversation.

Instructions:

## 0. Git & deploy hygiene (run first)

Before editing docs, ensure the codebase matches what we document and what can go to prod:

1. Run **`npm run predeploy:check`** (or `git status -sb` if the script fails).
2. If there are **uncommitted** changes from this conversation:
   - Summarize what changed (1–3 bullets).
   - Propose a **Conventional Commit** message (`feat(lk): …` / `fix(…): …`).
   - Ask whether to **commit now**; if user already asked to commit — do it (see user git rules).
3. If not on **`main`** and the **branch work is done** (feature, fix, refactor — whatever this session was) — remind: merge to `main`, then `npm run predeploy` before WinSCP.
4. If `predeploy:check` passes, note in output: **«Deploy snapshot: `<git log -1 --oneline>` on main»**.

Reference: [docs/development/GIT_WORKFLOW.md](../../docs/development/GIT_WORKFLOW.md) (§ «Перед WinSCP»).

Do **not** run WinSCP or deploy — only verify and advise.

---

## 1. Analyze

Review the entire conversation and the diff of the changes made.

---

## 2. Update docs (prefer targeted edits; keep hubs slim)

1. **Domain docs** — update the relevant file(s) under `docs/` (`CLIENT_AUTH`, `CLIENT_RBAC`, `WEB_FORMS`, `CALCULATOR_TZ_RULES`, `SITE_SETTINGS`, `REGISTRATION_PAGE`, `1C_*` if the 1C contract changed, etc.).
2. **CONTEXT.md** — only if a **permanent** fact changed (paths, auth model, HL IDs, current project focus). Keep it short: no session-by-session changelog, no API schema dumps.
3. **docs/README.md** — hub/TOC only. **Do not** append a long “Recent Changes” section.
4. **tasks/ROADMAP.md** / **tasks/LK_WAVES.md** — only if this work maps to a tracked milestone (check off items, update status); skip if the change was unrelated (hotfix, refactor, docs-only, etc.).
5. **docs/development/GIT_WORKFLOW.md** — only if deploy/git process changed (new paths to sync, new npm scripts, branch rules).
6. Capture non-obvious gotchas in the domain doc closest to the change.

Do **not** reintroduce deleted archive docs (`legacy/`, per-entity `migrations/*.md`, `CALCULATOR_FIXES`, `tz.pdf`, etc.). Migrations index: `docs/migrations/MIGRATIONS.md`.

---

## Output Requirements

Language: **English** for development/AI docs. Keep **`1C_*.md` in Russian** when editing those. **`GIT_WORKFLOW.md` and `LK_WAVES.md` stay Russian** unless the user asks otherwise.

Tone: Professional, technical, and concise.

Format: Maintain existing Markdown styling.

End with a short **Deploy readiness** block when code changed:

```
Deploy readiness
- Branch: …
- Git clean: yes/no
- Suggested commit: … (if needed)
- After merge: npm run predeploy → WinSCP www/local/
```

Please suggest the specific edits for the documentation files now.
