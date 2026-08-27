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
- Navigation / transition: [`navigationConfig`](app/lib/navigation/navigationConfig.ts) → [`NavigationState`](app/lib/navigation/NavigationState.ts) → [`Navigator`](app/lib/navigation/Navigator.ts) + [`TransitionController`](app/lib/navigation/TransitionController.ts) + [`poseReveal`](app/lib/navigation/poseReveal.ts) + [`app/lib/hero-ui/`](app/lib/hero-ui/)
- WP API: [`app/api/`](app/api/) → normalize [`app/domain/`](app/domain/) → types [`app/types/wp/`](app/types/wp/)
- Portfolio: [`app/pages/portfolio/`](app/pages/portfolio/) + [`app/components/archive/`](app/components/archive/) + [`app/components/case/`](app/components/case/) + [`usePortfolio`](app/composables/usePortfolio.ts)
- Persistent featured wash: archive = CSS row layers; case = [`PortfolioBackdrop`](app/components/portfolio/PortfolioBackdrop.vue) + [`usePortfolioBackdrop`](app/composables/usePortfolioBackdrop.ts); entrance gate [`usePortfolioWashGate`](app/composables/usePortfolioWashGate.ts) (outside → portfolio soft fade)
- Shared page meta: [`SiteChrome`](app/components/site/SiteChrome.vue) (`ARCHIVE` / `CASE / NN` / `SERVICE / NN` / section; no duplicate HUD frame)
- Title scramble: [`SiteScrambleTitle`](app/components/site/ScrambleTitle.vue) — gated on pose settle (+ case body idle); archive/section body fade via [`usePageContentReveal`](app/composables/usePageContentReveal.ts)
- Type: `--font-ui` JetBrains Mono (HUD / titles / troika); `--font-body` Exo 2 300 (case prose / intro / captions) — [`docs/DESIGN.md`](docs/DESIGN.md)
- Services: [`app/pages/services/`](app/pages/services/) + [`app/components/service/`](app/components/service/) + [`useServices`](app/composables/useServices.ts) — archive like portfolio **without** featured wash; detail = title/tags + intro + offer repeater
- About: [`app/pages/about.vue`](app/pages/about.vue) + [`app/components/about/`](app/components/about/) + [`useAbout`](app/composables/useAbout.ts)
- Contact: [`app/pages/contact.vue`](app/pages/contact.vue) + [`app/components/contact/`](app/components/contact/) + [`useContacts`](app/composables/useContacts.ts) — ACF `weblaba_contacts` + popup title/text
- Case visual: [`app/assets/css/case.css`](app/assets/css/case.css) + [`CaseShell`](app/components/case/CaseShell.vue) — [`docs/CASES.md`](docs/CASES.md) (featured wash is layout-owned, not inside CaseShell)
- Archive visual: [`app/assets/css/archive.css`](app/assets/css/archive.css)

## Current focus

**Persistent molecular shell is in:** canvas / controller live in the default layout across routes. Home is the only interactive spatial mode: hub `C` is always committed with full readout (typewriter blurb + USP), never an empty deselect. **Dual-state hover preview** (while committed): pulsing reticle, bright title, accent wireframe, and desktop SVG connector follow the preview atom without stealing focus. **Home idle autoplay** cycles committed nav items with a slide progress bar; while dwelling, the next atom gets a pulsing accent wireframe hint. Pauses on interaction. Other routes freeze the molecule and overlay page content after pose settle (`is-awaiting-pose`); settled freeze also lerps selection chrome (rings / cross / wireframe) to black. Leave-home approach: parallel zoom/fill + orbit (not one packed tween). `/about`, `/services` (plus `/services/:slug`), and `/contact` are live WP. Spatial architecture: [`docs/SPATIAL.md`](docs/SPATIAL.md). Full TZ: [`tasks/HEADLESS_NUXT_TZ.md`](tasks/HEADLESS_NUXT_TZ.md).

## Docs hub

See [`docs/README.md`](docs/README.md). Spatial shell: [`docs/SPATIAL.md`](docs/SPATIAL.md). Case / archive visual: [`docs/CASES.md`](docs/CASES.md). Content pipeline: [`docs/CONTENT.md`](docs/CONTENT.md). Hero math: [`docs/WEBGL_HERO.md`](docs/WEBGL_HERO.md). API shape: [`docs/api-real-response.md`](docs/api-real-response.md). Full TZ: [`tasks/HEADLESS_NUXT_TZ.md`](tasks/HEADLESS_NUXT_TZ.md).
