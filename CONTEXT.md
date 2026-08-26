# Context

Headless WebLaba frontend: Nuxt 4 + Vue 3 + molecular WebGL hero, WordPress REST as CMS source of truth.

## Stack

- Nuxt 4 + Vue 3 + TypeScript
- Tailwind CSS 4 (`@tailwindcss/vite`) + CSS variables (`--wl-*`, `--case-*`)
- Three.js (separate 3D layer — not R3F / React)
- GSAP (page-transition timeline in `Navigator`)
- troika-three-text (screen-flat atom captions via `AtomLabel`)
- WordPress REST: `NUXT_PUBLIC_WP_API_BASE` → `runtimeConfig.public.wpApiBase`

## Live preview

- Repository: [github.com/proto0654/molecule](https://github.com/proto0654/molecule)
- GitHub Pages (push to `main`): [proto0654.github.io/molecule](https://proto0654.github.io/molecule/)
- Local: `npm run dev` / `npm run build` / `npm run generate` / `npm run preview`
- Node: `^22.19.0` (see `package.json` engines)

## Entry points

- Nuxt app: [`app/app.vue`](app/app.vue), home [`app/pages/index.vue`](app/pages/index.vue)
- Hero Vue wrapper: [`app/components/molecular/MolecularHero.vue`](app/components/molecular/MolecularHero.vue)
- Hero bootstrap: [`app/lib/hero/mountHeroApp.ts`](app/lib/hero/mountHeroApp.ts)
- Scene / render loop: [`app/lib/molecular/MoleculeController.ts`](app/lib/molecular/MoleculeController.ts), [`MoleculeScene.ts`](app/lib/molecular/MoleculeScene.ts)
- Molecule data: [`app/lib/molecular/moleculeConfig.ts`](app/lib/molecular/moleculeConfig.ts)
- Navigation / transition: [`navigationConfig`](app/lib/navigation/navigationConfig.ts) → [`NavigationState`](app/lib/navigation/NavigationState.ts) → [`Navigator`](app/lib/navigation/Navigator.ts) + [`TransitionController`](app/lib/navigation/TransitionController.ts) + [`app/lib/hero-ui/`](app/lib/hero-ui/)
- WP API: [`app/api/`](app/api/) → normalize [`app/domain/`](app/domain/) → types [`app/types/wp/`](app/types/wp/)
- Portfolio: [`app/pages/portfolio/`](app/pages/portfolio/) + [`app/components/archive/`](app/components/archive/) + [`app/components/case/`](app/components/case/) + [`usePortfolio`](app/composables/usePortfolio.ts)
- Shared inner chrome: [`SiteChrome`](app/components/site/SiteChrome.vue) (archive `ARCHIVE` / case `CASE / NN`)
- Case visual: [`app/assets/css/case.css`](app/assets/css/case.css) + [`CaseShell`](app/components/case/CaseShell.vue) — [`docs/CASES.md`](docs/CASES.md)
- Archive visual: [`app/assets/css/archive.css`](app/assets/css/archive.css)

## Current focus

**Archive + route integration pass done:** editorial numbered listing (`NN` from slim index), SiteChrome on archive/case, veil handoff Home→Archive, session restore Archive↔Case, case→case without generic loader. Home stays spatial HUD. **Next:** full molecular → route choreography beyond the overlay handoff. Full TZ: [`tasks/HEADLESS_NUXT_TZ.md`](tasks/HEADLESS_NUXT_TZ.md).

## Docs hub

See [`docs/README.md`](docs/README.md). Case / archive visual: [`docs/CASES.md`](docs/CASES.md). Content pipeline: [`docs/CONTENT.md`](docs/CONTENT.md). Hero: [`docs/WEBGL_HERO.md`](docs/WEBGL_HERO.md). API shape: [`docs/api-real-response.md`](docs/api-real-response.md). Full TZ: [`tasks/HEADLESS_NUXT_TZ.md`](tasks/HEADLESS_NUXT_TZ.md).
