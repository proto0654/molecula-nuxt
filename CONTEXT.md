# Context

Headless WebLaba frontend: Nuxt 4 + Vue 3 + molecular WebGL hero, WordPress REST as CMS source of truth.

## Stack

- Nuxt 4 + Vue 3 + TypeScript
- Tailwind CSS 4 (`@tailwindcss/vite`) + CSS variables (`--wl-*`, `--case-*`)
- Three.js (separate 3D layer — not R3F / React)
- GSAP (page-transition timeline in `Navigator`)
- troika-three-text (screen-flat atom captions via `AtomLabel`; decorative hero tag cloud via `TagCloud`)
- WordPress REST: `NUXT_PUBLIC_WP_API_BASE` → `runtimeConfig.public.wpApiBase`

## Live sites

- **Production:** [weblaba.ru](https://weblaba.ru) — live (REG.RU rsync on push to `main`)
- **Preview:** [proto0654.github.io/molecula-nuxt](https://proto0654.github.io/molecula-nuxt/) — [deploy.yml](.github/workflows/deploy.yml) (`NUXT_APP_BASE_URL=/molecula-nuxt/`, `NUXT_PUBLIC_INDEXABLE=false`)
- **WordPress CMS:** [api.weblaba.ru/wp-json](https://api.weblaba.ru/wp-json) — `NUXT_PUBLIC_WP_API_BASE`
- Repository: [github.com/proto0654/molecula-nuxt](https://github.com/proto0654/molecula-nuxt) (`origin`; legacy Vite/prototype remote: `molecule` → [proto0654/molecule](https://github.com/proto0654/molecule))
- Local: `npm run dev` / `npm run build` / `npm run generate` / `npm run preview`
- Node: `^22.19.0` (see `package.json` engines)
- Deploy setup: [docs/DEPLOY.md](docs/DEPLOY.md)

## Entry points

- Nuxt app: [`app/app.vue`](app/app.vue) → [`layouts/default.vue`](app/layouts/default.vue) (persistent shell) + [`pages/index.vue`](app/pages/index.vue)
- Persistent molecule: [`MolecularHero.vue`](app/components/molecular/MolecularHero.vue) in the layout, not the home page
- Hero bootstrap: [`app/lib/hero/mountHeroApp.ts`](app/lib/hero/mountHeroApp.ts)
- Spatial state: [`app/lib/spatial/`](app/lib/spatial/) (`spatialFromRoute` → `SpatialController`) — [`docs/SPATIAL.md`](docs/SPATIAL.md)
- Scene / render loop: [`app/lib/molecular/MoleculeController.ts`](app/lib/molecular/MoleculeController.ts), [`MoleculeScene.ts`](app/lib/molecular/MoleculeScene.ts)
- Molecule data: [`app/lib/molecular/moleculeConfig.ts`](app/lib/molecular/moleculeConfig.ts)
- Navigation / transition: [`navigationConfig`](app/lib/navigation/navigationConfig.ts) → [`NavigationState`](app/lib/navigation/NavigationState.ts) → [`Navigator`](app/lib/navigation/Navigator.ts) + [`TransitionController`](app/lib/navigation/TransitionController.ts) + [`poseReveal`](app/lib/navigation/poseReveal.ts) + [`app/lib/hero-ui/`](app/lib/hero-ui/)
- WP API: [`app/api/`](app/api/) → normalize [`app/domain/`](app/domain/) → types [`app/types/wp/`](app/types/wp/)
- Theme Options (footer, scroll-top, GTM/schema, HUD chrome UI strings): [`useThemeOptions`](app/composables/useThemeOptions.ts) — [`docs/THEME_OPTIONS.md`](docs/THEME_OPTIONS.md)
- Molecule hero copy (page `hero_*` + titles): [`useMoleculeHeroNav`](app/composables/useMoleculeHeroNav.ts) — [`docs/HERO_WP_FIELDS.md`](docs/HERO_WP_FIELDS.md)
- Portfolio: [`app/pages/portfolio/`](app/pages/portfolio/) (`/portfolio` current + `/portfolio/legacy`) + [`app/components/archive/`](app/components/archive/) + [`app/components/case/`](app/components/case/) + [`usePortfolio`](app/composables/usePortfolio.ts) + shelf-scoped [`usePortfolioCaseNav`](app/composables/usePortfolioCaseNav.ts)
- Persistent featured wash: archive = CSS row layers; case = [`PortfolioBackdrop`](app/components/portfolio/PortfolioBackdrop.vue) + [`usePortfolioBackdrop`](app/composables/usePortfolioBackdrop.ts); entrance gate [`usePortfolioWashGate`](app/composables/usePortfolioWashGate.ts) (outside → portfolio soft fade)
- Shared page meta: [`SiteChrome`](app/components/site/SiteChrome.vue) (`ARCHIVE` / `CASE / NN` / `SERVICE / NN` / section; sole entity/index on detail pages — no duplicate above the H1; no duplicate HUD frame)
- Title scramble: [`SiteScrambleTitle`](app/components/site/ScrambleTitle.vue) — gated on pose settle (+ case body idle); page entrance via [`usePageContentReveal`](app/composables/usePageContentReveal.ts) + listing chain [`useListingReveal`](app/composables/useListingReveal.ts) — [`docs/MOTION.md`](docs/MOTION.md)
- Type: `--font-ui` JetBrains Mono (HUD / titles / troika); `--font-body` Exo 2 300 (case prose / intro / captions) — [`docs/DESIGN.md`](docs/DESIGN.md)
- Hairline language: `--wl-line`, grid-aligned rules, line-before-content on enter — [`docs/DESIGN.md`](docs/DESIGN.md#hairline-language) + [`docs/MOTION.md`](docs/MOTION.md)
- Services: [`app/pages/services/`](app/pages/services/) + [`app/components/service/`](app/components/service/) + [`useServices`](app/composables/useServices.ts) — archive like portfolio **without** featured wash; detail = `ArchiveShell` + intro + numbered offer repeater + `ArchiveDetailNav`
- About: [`app/pages/about.vue`](app/pages/about.vue) + [`app/components/about/`](app/components/about/) + [`useAbout`](app/composables/useAbout.ts) — `ArchiveShell` + photo + numbered skills repeater
- Contact: [`app/pages/contact.vue`](app/pages/contact.vue) + [`ContactArchiveRow`](app/components/contact/ContactArchiveRow.vue) + [`useContacts`](app/composables/useContacts.ts) — `ArchiveShell` + numbered contact rows
- SEO / a11y: [`usePageSeo`](app/composables/usePageSeo.ts) + [`homeSeo`](app/domain/seo/homeSeo.ts) + [`htmlPlain`](app/domain/wp/htmlPlain.ts); static `robots.txt` / `sitemap.xml` on generate — [`docs/SEO.md`](docs/SEO.md)
- Case visual: [`app/assets/css/case.css`](app/assets/css/case.css) + [`CaseShell`](app/components/case/CaseShell.vue) — [`docs/CASES.md`](docs/CASES.md) (featured wash is layout-owned, not inside CaseShell)
- Archive visual: [`app/assets/css/archive.css`](app/assets/css/archive.css)

## Current focus

**Persistent molecular shell is in:** canvas / controller live in the default layout across routes. Home is the only interactive spatial mode: hub `C` is always committed with full readout (typewriter blurb + USP), never an empty deselect. **Pointer spin** (desktop): orbit-bounded great-circle roll toward the cursor via [`pointerSpin.ts`](app/lib/molecular/pointerSpin.ts); pauses on peripheral atom hover. **Dual-state hover preview** (while committed): pulsing reticle, bright title, accent wireframe, **flowing hub bond dashes**, and desktop SVG connector follow the preview atom without stealing focus. **Home idle autoplay** cycles committed nav items with a slide progress bar; while dwelling, the next atom gets a pulsing accent wireframe plus **bond dash flow** (hub → next, phase-locked to the wireframe pulse). Pauses on interaction. Other routes freeze the molecule and overlay page content after pose settle (`is-awaiting-pose`); settled freeze also lerps selection chrome (rings / cross / wireframe) to black. Leave-home approach: parallel zoom/fill + orbit (not one packed tween). `/about`, `/services` (plus `/services/:slug`), and `/contact` are live WP. Foundation gaps closed (footer WP social menu off `/contact`, privacy prerender, GTM noscript, image `srcset`, `case_thanks_message`). **Next:** EN i18n. Spatial architecture: [`docs/SPATIAL.md`](docs/SPATIAL.md). Full TZ: [`tasks/HEADLESS_NUXT_TZ.md`](tasks/HEADLESS_NUXT_TZ.md).

## Docs hub

See [`docs/README.md`](docs/README.md). Spatial shell: [`docs/SPATIAL.md`](docs/SPATIAL.md). Case / archive visual: [`docs/CASES.md`](docs/CASES.md). Page entrance: [`docs/MOTION.md`](docs/MOTION.md). Content pipeline: [`docs/CONTENT.md`](docs/CONTENT.md). SEO / a11y: [`docs/SEO.md`](docs/SEO.md). Theme Options: [`docs/THEME_OPTIONS.md`](docs/THEME_OPTIONS.md). Hero WP fields: [`docs/HERO_WP_FIELDS.md`](docs/HERO_WP_FIELDS.md). Hero math: [`docs/WEBGL_HERO.md`](docs/WEBGL_HERO.md). API shape: [`docs/api-real-response.md`](docs/api-real-response.md). Full TZ: [`tasks/HEADLESS_NUXT_TZ.md`](tasks/HEADLESS_NUXT_TZ.md).
