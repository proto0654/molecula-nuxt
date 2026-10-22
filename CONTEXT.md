# Context

Headless WebLaba frontend: Nuxt 4 + Vue 3 + molecular WebGL hero, WordPress REST as CMS source of truth.

## Stack

- Nuxt 4 + Vue 3 + TypeScript
- Tailwind CSS 4 (`@tailwindcss/vite`) + CSS variables (`--wl-*`, `--case-*`)
- Three.js (separate 3D layer — not R3F / React)
- GSAP (page-transition timeline in `Navigator`)
- troika-three-text (screen-flat atom captions via `AtomLabel`; decorative hero tag cloud via `TagCloud`)
- WordPress REST: `NUXT_PUBLIC_WP_API_BASE` → `runtimeConfig.public.wpApiBase` (generate + `nuxt dev` only; production client is payload-only SSG)

## Live sites

- **Production:** [weblaba.ru](https://weblaba.ru) — live (REG.RU rsync on push to `main`)
- **Preview:** [proto0654.github.io/molecula-nuxt](https://proto0654.github.io/molecula-nuxt/) — [deploy.yml](.github/workflows/deploy.yml) (`NUXT_APP_BASE_URL=/molecula-nuxt/`, `NUXT_PUBLIC_INDEXABLE=false`)
- **WordPress CMS:** [api.weblaba.ru/wp-json](https://api.weblaba.ru/wp-json) — `NUXT_PUBLIC_WP_API_BASE`
- Repository: [github.com/proto0654/molecula-nuxt](https://github.com/proto0654/molecula-nuxt) (`origin`; legacy Vite/prototype remote: `molecule` → [proto0654/molecule](https://github.com/proto0654/molecule))
- Local: `npm run dev` / `npm run build` / `npm run generate` / `npm run preview`
- Node: `^22.19.0 || ^24.11.0 || >=26.0.0` (see `package.json` engines)
- Deploy setup: [docs/DEPLOY.md](docs/DEPLOY.md)

## Entry points

- Nuxt app: [`app/app.vue`](app/app.vue) → [`layouts/default.vue`](app/layouts/default.vue) (persistent shell) + [`pages/index.vue`](app/pages/index.vue)
- Persistent molecule: [`MolecularHero.vue`](app/components/molecular/MolecularHero.vue) in the layout, not the home page
- Hero bootstrap: [`app/lib/hero/mountHeroApp.ts`](app/lib/hero/mountHeroApp.ts)
- Spatial state: [`app/lib/spatial/`](app/lib/spatial/) (`spatialFromRoute` → `SpatialController`) — [`docs/SPATIAL.md`](docs/SPATIAL.md)
- Scene / render loop: [`app/lib/molecular/MoleculeController.ts`](app/lib/molecular/MoleculeController.ts), [`MoleculeScene.ts`](app/lib/molecular/MoleculeScene.ts)
- Atmosphere layer: [`app/lib/molecular/effects/`](app/lib/molecular/effects/) - dust, rim, single drafting shell, comet; tiered by quality - [`docs/EFFECTS.md`](docs/EFFECTS.md)
- Molecule data: [`app/lib/molecular/moleculeConfig.ts`](app/lib/molecular/moleculeConfig.ts)
- Navigation / transition: [`navigationConfig`](app/lib/navigation/navigationConfig.ts) → [`NavigationState`](app/lib/navigation/NavigationState.ts) → [`Navigator`](app/lib/navigation/Navigator.ts) + [`TransitionController`](app/lib/navigation/TransitionController.ts) + [`poseReveal`](app/lib/navigation/poseReveal.ts) + [`app/lib/hero-ui/`](app/lib/hero-ui/)
- WP API: [`app/api/`](app/api/) → normalize [`app/domain/`](app/domain/) → types [`app/types/wp/`](app/types/wp/)
- Theme Options (footer, scroll-top, GTM/schema, HUD chrome UI strings): [`useThemeOptions`](app/composables/useThemeOptions.ts) — [`docs/THEME_OPTIONS.md`](docs/THEME_OPTIONS.md)
- Molecule hero copy (page `hero_*` + titles): [`useMoleculeHeroNav`](app/composables/useMoleculeHeroNav.ts) — [`docs/HERO_WP_FIELDS.md`](docs/HERO_WP_FIELDS.md)
- Portfolio: [`app/pages/portfolio/`](app/pages/portfolio/) (`/portfolio` current + `/portfolio/legacy`) + [`app/components/archive/`](app/components/archive/) + [`app/components/case/`](app/components/case/) + [`usePortfolio`](app/composables/usePortfolio.ts) + shelf-scoped [`usePortfolioCaseNav`](app/composables/usePortfolioCaseNav.ts)
- Page background: fully transparent over the frozen molecule — there is **no** featured-image backdrop layer and no accent page fill; case accent (`--case-accent` / `--case-accent-ink`) drives chrome only
- Shared page meta: [`SiteChrome`](app/components/site/SiteChrome.vue) (`ARCHIVE` / `CASE / NN` / `SERVICE / NN` / section; sole entity/index on detail pages — no duplicate above the H1; no duplicate HUD frame)
- Title scramble: [`SiteScrambleTitle`](app/components/site/ScrambleTitle.vue) — gated on pose settle (+ case body idle); page entrance via [`usePageContentReveal`](app/composables/usePageContentReveal.ts) + listing chain [`useListingReveal`](app/composables/useListingReveal.ts) — [`docs/MOTION.md`](docs/MOTION.md)
- Type: `--font-ui` JetBrains Mono (HUD / titles / troika); `--font-body` Exo 2 300 (case prose / intro / captions) — [`docs/DESIGN.md`](docs/DESIGN.md)
- Brand accent: `--color-accent` / `ACCENT_COLOR` `#6ec99f` (logo) — HUD cues, listing hovers, committed reticle, scramble glow — [`docs/DESIGN.md`](docs/DESIGN.md)
- Hairline language: `--wl-line`, grid-aligned rules, line-before-content on enter — [`docs/DESIGN.md`](docs/DESIGN.md#hairline-language) + [`docs/MOTION.md`](docs/MOTION.md)
- Services: [`app/pages/services/`](app/pages/services/) + [`app/components/service/`](app/components/service/) + [`useServices`](app/composables/useServices.ts) — archive like portfolio **without** the case visual system; detail = `ArchiveShell` + intro + numbered offer repeater + `ArchiveDetailNav`
- About: [`app/pages/about.vue`](app/pages/about.vue) + [`app/components/about/`](app/components/about/) + [`useAbout`](app/composables/useAbout.ts) — `ArchiveShell` + photo + numbered skills repeater
- Contact: [`app/pages/contact.vue`](app/pages/contact.vue) + [`ContactArchiveRow`](app/components/contact/ContactArchiveRow.vue) + [`useContacts`](app/composables/useContacts.ts) — `ArchiveShell` + numbered contact rows
- SEO / a11y: [`usePageSeo`](app/composables/usePageSeo.ts) + [`homeSeo`](app/domain/seo/homeSeo.ts) + [`htmlPlain`](app/domain/wp/htmlPlain.ts); static `robots.txt` / `sitemap.xml` on generate — [`docs/SEO.md`](docs/SEO.md)
- Case visual: [`app/assets/css/case.css`](app/assets/css/case.css) + [`CaseShell`](app/components/case/CaseShell.vue) — [`docs/CASES.md`](docs/CASES.md)
- Archive visual: [`app/assets/css/archive.css`](app/assets/css/archive.css)

## Current focus

**Atmosphere layer:** home carries **data dust** (one `Points`, ~104–120 chunky squares, shell drift + a continuous stream from the hub to the next atom; when that atom is the hub itself the same rows dive in from the shell around it, since the hub owns no bond and no orbit; each stream point owns a randomized launch/travel loop and vanishes on arrival, so the flow stays tight to the connector and never clumps or repeats a path), atom rims, a single rotating drafting shell and a comet on the **upcoming** atom's orbit — hover or autoplay-next, born at that atom and lapping its ring once per active-atom cycle. No glow plane. The static dashed hub→atom connector stays visible; only the animated dash flow is retired. Committed atoms no longer get a static white wireframe. Peripheral routes freeze into a drafting field - one still drafting shell in a fixed pose (no rotation, no scroll-driven scale) and no comet or stream. No surface lattice, no blurred sweep. HIGH / MEDIUM / LOW grades degrade it in place. Pose, freeze and focus logic are unchanged; routes carry no scroll-driven atmosphere. [`docs/EFFECTS.md`](docs/EFFECTS.md).

**Persistent molecular shell is in:** canvas / controller live in the default layout across routes. Home is the only interactive spatial mode: hub `C` is always committed with full readout (typewriter blurb + USP), never an empty deselect. **Molecule hero marketing copy** (RU/EN `hero_*`) lives on the five WP nav pages — seed + live CMS refreshed 2026-09-19; typewriter tails are grammatical after `{кликай|тапай}` (`navBlurbCta` re-spaces after trim). **Orphan prepositions:** [`fixOrphanPrepositions`](app/domain/wp/fixOrphanPrepositions.ts) glues short RU/EN particles with NBSP on USP, atom typewriter blurbs (`AtomLabel`), case/service titles, offer titles, and detail prev/next — apply after `stripTags` ([`docs/CONTENT.md`](docs/CONTENT.md)). Prod is strict SSG — WP edits need generate deploy. **Pointer spin** (desktop): orbit-bounded great-circle roll toward the cursor via [`pointerSpin.ts`](app/lib/molecular/pointerSpin.ts); pauses on peripheral atom hover. **Dual-state hover preview** (while committed): pulsing reticle, bright title, accent wireframe, and desktop SVG connector follow the preview atom without stealing focus. Committed atom keeps its reticle only — its static wireframe is retired. **Home boot** (direct load of `/` only): the molecule assembles out of its hub at screen centre - rings tumble out of an edge-on line, dust spirals out of the centre, then one comet runs the orbits and each atom appears where it lands, connector first - while the framing drifts to the desktop stage bias and the chrome draws in with it; skipped on first input, absent under reduced motion ([`docs/MOTION.md`](docs/MOTION.md)). **Home idle autoplay** cycles committed nav items with a slide progress bar; from the commit frame the next atom gets a pulsing accent wireframe, its orbit comet and the hub dust stream, and its caption fills on the same beat (one beat per interval, dark for the first half, black → chrome ink by the commit). Pauses on interaction. A **manual atom select** (click / HUD / connector) hints that next atom on the click frame and holds it through the idle pause — only a preview of another atom or an open menu takes the hint over. Other routes freeze the molecule and overlay page content after pose settle (`is-awaiting-pose`); settled freeze also lerps selection chrome (rings / cross) to black. Leave-home approach: parallel zoom/fill + orbit (not one packed tween). `/about`, `/services` (plus `/services/:slug`), and `/contact` are WP-backed SSG (payload at generate). Foundation gaps closed. **EN i18n:** `/en/*` routes, `useLocale()`, `*_en` resolve in normalizers, `LocaleSwitch`, hreflang + prerender pairs — [`app/domain/i18n/`](app/domain/i18n/). Spatial architecture: [`docs/SPATIAL.md`](docs/SPATIAL.md). Full TZ: [`tasks/HEADLESS_NUXT_TZ.md`](tasks/HEADLESS_NUXT_TZ.md).

## Docs hub

See [`docs/README.md`](docs/README.md). Spatial shell: [`docs/SPATIAL.md`](docs/SPATIAL.md). Case / archive visual: [`docs/CASES.md`](docs/CASES.md). Page entrance: [`docs/MOTION.md`](docs/MOTION.md). Content pipeline: [`docs/CONTENT.md`](docs/CONTENT.md). SEO / a11y: [`docs/SEO.md`](docs/SEO.md). Theme Options: [`docs/THEME_OPTIONS.md`](docs/THEME_OPTIONS.md). Hero WP fields: [`docs/HERO_WP_FIELDS.md`](docs/HERO_WP_FIELDS.md). Hero math: [`docs/WEBGL_HERO.md`](docs/WEBGL_HERO.md). Atmosphere: [`docs/EFFECTS.md`](docs/EFFECTS.md). API shape: [`docs/api-real-response.md`](docs/api-real-response.md). Full TZ: [`tasks/HEADLESS_NUXT_TZ.md`](tasks/HEADLESS_NUXT_TZ.md).
