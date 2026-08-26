# actualize

Role: Technical Writer and Software Architect.
Task: Update the project documentation based on the recent changes implemented in this conversation.

This repo is the **headless WebLaba frontend**: Nuxt 4 + Vue 3 + molecular WebGL hero, WordPress REST as CMS source of truth. Canonical code lives under `app/`. Do **not** document leftover Vite `src/` as current.

Instructions:

## 0. Git & build hygiene (run first)

Before editing docs, ensure the codebase matches what we document:

1. Run **`git status -sb`**. Optionally verify if this session changed TypeScript / scene / Nuxt / API / prerender:
   - `npm run build` — type/runtime smoke
   - `npm run generate` — if routes, `nitro:config` prerender, WP client, or GitHub Pages config changed
2. If there are **uncommitted** changes from this conversation:
   - Summarize what changed (1–3 bullets).
   - Propose a **Conventional Commit** scoped to the area (`feat(hero):` / `feat(3d):` / `feat(nav):` / `feat(portfolio):` / `feat(api):` / `feat(case):` / `feat(transition):` / `fix(…):` / `docs:`).
   - Ask whether to **commit now**; if the user already asked to commit — do it (see user git rules).
   - Never stage `.env` or secrets. `.env.example` is fine.
3. If not on **`main`** and the **branch work is done** — remind: merge to `main` when ready (Pages deploys on push to `main`).
4. Note in output: **«Snapshot: `<git log -1 --oneline>` on `<branch>`»**.

Deploy already exists: [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) runs `npm run generate` with `NUXT_APP_BASE_URL=/molecule/` and `NUXT_PUBLIC_WP_API_BASE`. Do **not** invent a second pipeline. Only document workflow / env / `baseURL` changes if they actually changed.

Node: `^22.19.0` (see `package.json` engines). Scripts: `npm run dev` / `build` / `generate` / `preview`.

---

## 1. Analyze

Review the entire conversation and the diff of the changes made. Prefer facts from code + [`CONTEXT.md`](../../CONTEXT.md) + [`tasks/HEADLESS_NUXT_TZ.md`](../../tasks/HEADLESS_NUXT_TZ.md) section A over stale doc paths.

---

## 2. Update docs (prefer targeted edits; keep hubs slim)

Route by **what changed**. Skip files that were not affected. The table below is the **default home** for known domains — not a closed list. The project is growing: add a new `docs/*.md` (or `tasks/*.md` for iteration TZ/checkpoints) when a domain does not fit an existing file without bloating it.

| Change | Update |
|--------|--------|
| Three.js / molecule / HUD wiring / focus / Navigator | [`docs/WEBGL_HERO.md`](../../docs/WEBGL_HERO.md) — architecture, module roles, config types, scene constraints, gotchas. Use **`app/`** paths (`mountHeroApp.ts`, `app/lib/molecular/`, `app/lib/navigation/`, `app/lib/hero-ui/`). |
| HUD tokens, palette, decorative patterns, `--wl-*` | [`docs/DESIGN.md`](../../docs/DESIGN.md) — keep CSS tables in sync with [`app/assets/css/main.css`](../../app/assets/css/main.css) and Three.js hex duplicates. |
| WP REST shape, endpoints, ACF, menus, pagination headers | [`docs/api-real-response.md`](../../docs/api-real-response.md). Mirror short facts in TZ section C only if they changed. |
| Permanent facts: stack, entry points, live preview URL, **current focus** | [`CONTEXT.md`](../../CONTEXT.md) — short only. No session changelog, no full API dumps. Point to domain docs instead of absorbing them. |
| Tracked milestone (Done / Next) | [`tasks/ROADMAP.md`](../../tasks/ROADMAP.md). Current **Next**: case visual redesign (TZ §25); full molecular → route transition (beyond foundation `transitionTo`); remaining hero routes (`/about`, `/services`, `/contact`) with real content. Skip ROADMAP for docs-only or tiny refactors. |
| Iteration checkpoint (STEP status, “what is in repo”, “start next chat with”) | [`tasks/HEADLESS_NUXT_TZ.md`](../../tasks/HEADLESS_NUXT_TZ.md) **section A** (and the short prompt in **D** if the next starting point changed). **Never rewrite or “improve” section B** (original user TZ). New iteration TZ → new `tasks/*.md`, do not append unrelated specs into this file. |
| New or renamed doc | Add/update one row in [`docs/README.md`](../../docs/README.md). Hub/TOC only — do **not** append a long “Recent Changes” section. |

**When to create a new doc:** a distinct durable domain (e.g. case page visual system, transitions, prerender/deploy, content pipeline, a new route area) that would make an existing file hard to scan. Prefer one focused file over stuffing CONTEXT or WEBGL_HERO. Name it clearly (`docs/CASES.md`, `docs/TRANSITIONS.md`, …). After creating it, link from `docs/README.md` and, if it is now a permanent entry point, from CONTEXT.

Capture non-obvious gotchas where they belong (existing file or the new domain doc):

- Hero: dispose/HMR, bond orientation, color maps, `navigationConfig` `atomId` alignment, `ClientOnly` mount, `TransitionController` vs `Navigator` zoom.
- Content: absence = `null` / `[]` (do not render empty sections); components must not call WP URLs directly.
- Prerender: portfolio slugs queued in `nitro:config` from live WP; Pages is static (`generate`), no Nitro server.

Do **not** create Bitrix / 1C / LK / WinSCP docs, migration archives, or parallel session “fixes” changelogs. Do **not** duplicate the same architecture in three places — update the domain doc and keep CONTEXT/hub as pointers.

---

## Output Requirements

Language:

- **English** for `CONTEXT.md`, `docs/*` (including new architecture/domain docs), unless the user asks otherwise.
- **Russian** for `tasks/HEADLESS_NUXT_TZ.md` (keep section B verbatim) and new `tasks/*` TZ/checkpoint files that continue that thread. `tasks/ROADMAP.md` may mix English Done items with Russian Next items that match the TZ.

Tone: Professional, technical, and concise.

Format: Maintain existing Markdown styling.

End with a short **Session readiness** block when code changed:

```
Session readiness
- Branch: …
- Git clean: yes/no
- Suggested commit: … (if needed)
- Verify: npm run build (if TS/scene/Nuxt changed); npm run generate (if prerender/Pages/API routes changed) → npm run preview
- Pages: push to main → Actions `nuxt generate` (base `/molecule/`)
```

Please suggest the specific edits for the documentation files now.
