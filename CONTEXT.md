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

- Repository: [github.com/proto0654/molecula-nuxt](https://github.com/proto0654/molecula-nuxt) (`origin`; legacy Vite/prototype remote: `molecule` → [proto0654/molecule](https://github.com/proto0654/molecule))
- GitHub Pages (push to `main`): [proto0654.github.io/molecula-nuxt](https://proto0654.github.io/molecula-nuxt/) (`NUXT_APP_BASE_URL=/molecula-nuxt/`)
- Local: `npm run dev` / `npm run build` / `npm run generate` / `npm run preview`
- Node: `^22.19.0` (see `package.json` engines)

## Entry points

- Nuxt app: [`app/app.vue`](app/app.vue) → [`layouts/default.vue`](app/layouts/default.vue) (persistent shell) + [`pages/index.vue`](app/pages/index.vue)
- Persistent molecule: [`MolecularHero.vue`](app/components/molecular/MolecularHero.vue) in the layout, not the home page
- Hero bootstrap: [`app/lib/hero/mountHeroApp.ts`](app/lib/hero/mountHeroApp.ts)
- Spatial state: [`app/lib/spatial/`](app/lib/spatial/) (`spatialFromRoute` → `SpatialController`) — [`docs/SPATIAL.md`](docs/SPATIAL.md)
- Scene / render loop: [`app/lib/molecular/MoleculeController.ts`](app/lib/molecular/MoleculeController.ts), [`MoleculeScene.ts`](app/lib/molecular/MoleculeScene.ts)
- Molecule data: [`app/lib/molecular/moleculeConfig.ts`](app/lib/molecular/moleculeConfig.ts)
- Navigation / transition: [`navigationConfig`](app/lib/navigation/navigationConfig.ts) → [`NavigationState`](app/lib/navigation/NavigationState.ts) → [`Navigator`](app/lib/navigation/Navigator.ts) + [`TransitionController`](app/lib/navigation/TransitionController.ts) + [`app/lib/hero-ui/`](app/lib/hero-ui/)
- WP API: [`app/api/`](app/api/) → normalize [`app/domain/`](app/domain/) → types [`app/types/wp/`](app/types/wp/)
- Portfolio: [`app/pages/portfolio/`](app/pages/portfolio/) + [`app/components/archive/`](app/components/archive/) + [`app/components/case/`](app/components/case/) + [`usePortfolio`](app/composables/usePortfolio.ts)
- Shared page meta: [`SiteChrome`](app/components/site/SiteChrome.vue) (`ARCHIVE` / `CASE / NN` / section stubs; no duplicate HUD frame)
- Section stubs: [`/about`](app/pages/about.vue), [`/services`](app/pages/services/index.vue), [`/contact`](app/pages/contact.vue) + [`SectionShell`](app/components/section/SectionShell.vue)
- Case visual: [`app/assets/css/case.css`](app/assets/css/case.css) + [`CaseShell`](app/components/case/CaseShell.vue) — [`docs/CASES.md`](docs/CASES.md)
- Archive visual: [`app/assets/css/archive.css`](app/assets/css/archive.css)

## Current focus

**Persistent molecular shell is in:** canvas / controller live in the default layout across routes. Home is the only interactive spatial mode: hub `C` is always committed with full readout (typewriter blurb + USP), never an empty deselect. Other routes freeze the molecule and overlay page content. Section stubs (`/about`, `/services`, `/contact`) follow the same approach pose. Spatial architecture: [`docs/SPATIAL.md`](docs/SPATIAL.md). Full TZ: [`tasks/HEADLESS_NUXT_TZ.md`](tasks/HEADLESS_NUXT_TZ.md).

## Docs hub

See [`docs/README.md`](docs/README.md). Spatial shell: [`docs/SPATIAL.md`](docs/SPATIAL.md). Case / archive visual: [`docs/CASES.md`](docs/CASES.md). Content pipeline: [`docs/CONTENT.md`](docs/CONTENT.md). Hero math: [`docs/WEBGL_HERO.md`](docs/WEBGL_HERO.md). API shape: [`docs/api-real-response.md`](docs/api-real-response.md). Full TZ: [`tasks/HEADLESS_NUXT_TZ.md`](tasks/HEADLESS_NUXT_TZ.md).
