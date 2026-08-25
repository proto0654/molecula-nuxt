# actualize

Role: Technical Writer and Software Architect.
Task: Update the project documentation based on the recent changes implemented in this conversation.

Instructions:

## 0. Git & build hygiene (run first)

Before editing docs, ensure the codebase matches what we document:

1. Run **`git status -sb`**. Optionally run **`npm run build`** if TypeScript / scene code changed this session (catch type errors before documenting).
2. If there are **uncommitted** changes from this conversation:
   - Summarize what changed (1–3 bullets).
   - Propose a **Conventional Commit** message scoped to the area (`feat(hero): …` / `feat(3d): …` / `feat(nav): …` / `fix(…): …` / `docs: …`).
   - Ask whether to **commit now**; if user already asked to commit — do it (see user git rules).
3. If not on **`main`** and the **branch work is done** — remind: merge to `main` when ready.
4. Note in output: **«Snapshot: `<git log -1 --oneline>` on `<branch>`»**.

Do **not** invent a deploy pipeline — this prototype ships via Vite (`npm run dev` / `npm run build` / `npm run preview`). Only verify and advise.

---

## 1. Analyze

Review the entire conversation and the diff of the changes made.

---

## 2. Update docs (prefer targeted edits; keep hubs slim)

1. **Domain docs** — update the relevant file(s):
   - [`docs/WEBGL_HERO.md`](../../docs/WEBGL_HERO.md) — architecture, module roles, config types, scene constraints, gotchas (default home for Three.js / molecule / navigation wiring changes).
2. **CONTEXT.md** — only if a **permanent** fact changed (stack, entry points, current focus). Keep it short: no session-by-session changelog, no full API dumps.
3. **docs/README.md** — hub/TOC only. **Do not** append a long “Recent Changes” section. Add a row only when a **new** doc file is introduced.
4. **tasks/ROADMAP.md** — only if this work maps to a tracked milestone (check off Done / move items under Next); skip if unrelated (docs-only, tiny refactor, etc.).
5. Capture non-obvious gotchas in `WEBGL_HERO.md` (dispose/HMR, bond orientation, color maps, config sync with `navigationConfig.atomOrder`, etc.).

Do **not** create Bitrix / 1C / LK / WinSCP docs, migration archives, or parallel “fixes” changelogs. Keep the doc set small: `CONTEXT.md`, `docs/WEBGL_HERO.md`, `docs/README.md`, `tasks/ROADMAP.md`.

---

## Output Requirements

Language: **English** for all project docs (`CONTEXT.md`, `docs/*`, `tasks/ROADMAP.md`) unless the user asks otherwise.

Tone: Professional, technical, and concise.

Format: Maintain existing Markdown styling.

End with a short **Session readiness** block when code changed:

```
Session readiness
- Branch: …
- Git clean: yes/no
- Suggested commit: … (if needed)
- Verify: npm run build (if TS/scene changed) → npm run preview
```

Please suggest the specific edits for the documentation files now.
