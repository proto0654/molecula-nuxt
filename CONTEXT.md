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
- Portfolio: [`app/pages/portfolio/`](app/pages/portfolio/) + [`app/components/case/`](app/components/case/) + [`usePortfolio`](app/composables/usePortfolio.ts)
- Case visual: [`app/assets/css/case.css`](app/assets/css/case.css) + [`CaseShell`](app/components/case/CaseShell.vue) — [`docs/CASES.md`](docs/CASES.md)

## Current focus

**Case visual redesign + composition pass done** (TZ §25): sequential `NN / LABEL` markers, density recipes for missing blocks, motion levels, numbered NEXT footer, in-page case→case reveal. Editorial case pages on a 12-col grid, **no WebGL**. Conditional rendering and absence-as-null unchanged. **Next:** full molecular → route transition (foundation `transitionTo` already exists). Full TZ: [`tasks/HEADLESS_NUXT_TZ.md`](tasks/HEADLESS_NUXT_TZ.md).

## Docs hub

See [`docs/README.md`](docs/README.md). Case visual / composition: [`docs/CASES.md`](docs/CASES.md). Content pipeline: [`docs/CONTENT.md`](docs/CONTENT.md). API shape: [`docs/api-real-response.md`](docs/api-real-response.md). Full TZ: [`tasks/HEADLESS_NUXT_TZ.md`](tasks/HEADLESS_NUXT_TZ.md).
