# WebLaba — headless Nuxt frontend

Nuxt 4 + Vue 3 + TypeScript frontend for [weblaba.ru](https://weblaba.ru). WordPress REST
(`api.weblaba.ru/wp-json`) is the CMS; the Three.js molecule is the **persistent shell of the
whole app**, not a home-page hero. Production is **strict SSG**: the browser reads payload only.

## Docs

- Context snapshot (stack, entry points, current focus): [CONTEXT.md](CONTEXT.md)
- Docs hub (one row per document): [docs/README.md](docs/README.md)
- Requirements + migration checkpoint: [tasks/HEADLESS_NUXT_TZ.md](tasks/HEADLESS_NUXT_TZ.md)
- Plan / history: [tasks/ROADMAP.md](tasks/ROADMAP.md)

Language convention: **project documentation is English** (older Russian docs — the TZ and
ROADMAP — stay Russian when edited). UI copy is Russian (`html lang="ru"`), with `/en/*`
mirrors. Reply to the user in Russian. These project docs override global engineering rules.

## Commands

```bash
npm ci
npm run dev        # live WordPress REST
npm run generate   # SSG build; fetches slugs + payload from the live API
npm run build      # server build
npm run preview
```

There is **no test, lint, or typecheck script**, and `typescript.typeCheck` is `false`.
Verification today = `npm run generate` plus a manual browser pass. Say so instead of
claiming a change is tested.

## Hard rules

1. **Strict SSG.** `wpFetch` must stay blocked in the production client
   ([app/api/client.ts](app/api/client.ts)). CMS edits reach the site only via generate + deploy.
2. **One molecule.** One canvas, renderer, scene and rAF loop, owned by
   [app/layouts/default.vue](app/layouts/default.vue). Never mount it from a page.
3. **No Three.js on content pages** — archive, case, service, about, contact are HTML/CSS over
   the frozen molecule.
4. **Absence is a valid state.** Missing ACF stays `null` / `[]`; never invent placeholders or
   CMS defaults.
5. **No WP URLs in components.** Route through `app/api/` → `app/domain/` normalizers.
6. **Do not re-add the removed featured wash** (`PortfolioBackdrop`, `usePortfolioWashGate`,
   `--backdrop-accent`); it was deleted in `43c2de4`.
7. **Never commit `.env`**, never print secrets, and deploy only when explicitly asked.
8. Conventional Commits, one logical change per commit, first line ≤ 72 chars.
