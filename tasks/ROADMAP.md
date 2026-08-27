# Roadmap

ТЗ [`HEADLESS_NUXT_TZ.md`](HEADLESS_NUXT_TZ.md) §§1–29 — разделы требований, не 29 задач. Закрытая итерация = **STEPs 1–19 из §27** + acceptance §28. Не дублировать сюда 29 чекбоксов один-к-одному.

- **§25** — case visual redesign: Done (editorial case pages; overlay the persistent frozen molecule).
- **§29** — инструкция для первого ответа прошлого чата, не deliverable.

## Done

- [x] Vite + TypeScript scaffold
- [x] Fullscreen Three.js hero (scene, camera, renderer, resize, loop)
- [x] Declarative molecule config (`AtomConfig` / `BondConfig` / `MoleculeConfig`)
- [x] Config-driven `Atom` (matte flat icosahedron) + `Bond` (dashed line); `userData.atomId`
- [x] Five-atom test molecule (hub + peripherals on curated orbits)
- [x] Pointer mouse influence via quaternion (`mouseOrientation` / `targetMouseOrientation`, axis-angle, slerp)
- [x] Pure math helpers (`getStableFocusQuaternion`, `getFocusQuaternion`, `getAtomFocusDistance`, orientation, projection)
- [x] Focus orientation layer + `focusStrength ∈ [0,1]`; compose `appliedFocus × mouse × base`
- [x] Atom hover picking (`AtomHover` raycast)
- [x] Billboard atom captions (`AtomLabel`: first letter + remainder; `caption` on config)
- [x] Declarative nav config (`NavigationItem` + `blurb`) + techno HTML overlay; `NavigationState` (atomHover + navHover + committed)
- [x] Hover preview → highlight + pulse reticle (no focus); first click → `focusAtom` + frozen reticle + troika typewriter blurb
- [x] Second click → GSAP `Navigator.navigateTo` (zoom); destination stub + Return (`cancel`)
- [x] AtomSelectionIndicator concentric rings (pulse / freeze; world-space); HUD grid + corners; desktop / tablet / mobile layout
- [x] HUD design tokens (`:root` in `styles.css`) + [`docs/DESIGN.md`](../docs/DESIGN.md) decorative patterns
- [x] Render-loop hygiene audit: single matrix update, dirty-gated labels, every-frame selection tick, `visualViewport` / DPR resize, dispose `forceContextLoss`, no hot-path allocs
- [x] QualityManager (`high` / `medium` / `low`) + lock-once performance sample + capped pixel ratio
- [x] Shared low-poly geometry (`GeometryCache`); selected wireframe; quality-gated selection rings + decorative orbits
- [x] Dev-only throttled perf overlay (`DEBUG_PERF` / `?debug=0`)
- [x] Faceted matte graphite look (flatShading icosahedrons, dashed bonds, orbital ghost, selection rings, no postprocessing)
- [x] HTML sidebar / SVG connectors via `projectAtom` (keep HUD out of WebGL); desktop composition bias
- [x] Mobile composition (profiles, SiteHeader + MENU overlay, compact rail, touch drag/tap, hub/orbit compact layout)
- [x] Hero polish: spherical per-atom orbits, mouse-under-focus attenuation, screen-flat selection, quieter HUD
- [x] Russian UI copy + JetBrains Mono (CSS + troika); captions from `navigationConfig`
- [x] HUD USP headline (`UspHeadline` + scramble after `isFocusSettled`); desktop/mobile layout polish; atom hover cursor
- [x] GitHub Pages deploy (Actions workflow; Vite `base` + troika font via `import.meta.env.BASE_URL`)
- [x] Nuxt 4 + Vue 3 migration; Tailwind 4; `--wl-*` tokens; WP runtime config; API inspection + raw types (STEP 1–8)
- [x] API client + normalize Case; `/portfolio` archive + pagination headers (STEP 9–11)
- [x] `/portfolio/[slug]` + conditional case components; prev/next helper (STEP 12–14)
- [x] Menu via `menus/v1`; prerender portfolio slugs; TransitionController foundation (STEP 15–16)
- [x] Wire hero `Navigator` to real Nuxt routes (`/portfolio`) (STEP 17–18 foundation)
- [x] STEP 9–19 + acceptance §28 (без case redesign)
- [x] Document scroll unlock on portfolio/case (`html.hero-lock` only on home)
- [x] Case visual redesign (§25): editorial 12-col case pages, CaseShell chrome, video hero + featured backdrop, Screens = landing+repeater (inner-pages), lightbox, ScrollTrigger entry
- [x] Persistent molecular shell: layout-owned canvas, spatial state machine, home hub always focused, freeze off-home
- [x] Case composition pass: sequential markers (including NEXT), density recipes A–G, motion L1/L2/L3, in-page case→case reveal + delayed accent
- [x] Portfolio archive + Home/Case integration: editorial numbered rows, SiteChrome, veil handoff, session restore, case→case without generic loader
- [x] Section stubs `/about` `/services` `/contact` + approach hold; off-home header route menu; single approach tween; no page scrim

## Foundation gaps

STEPs 1–19 остаются Done. Мелкий долг foundation:

- [x] §15 Prev/next titles: slim index includes `title`; footer uses real titles
- [ ] §16 Menu: API `menus/v1` + `useWpMenu` есть, ни одна страница composable не вызывает
- [ ] §23 SEO: `useSeoMeta` title + excerpt есть, canonical нет

Смежные (не отдельные STEPs): нет `srcset` (§22). Error states (§21) на foundation-уровне уже есть — отдельный чекбокс не нужен.

## Next

Shell + stubs закрыты. Не ломать content pipeline и `absence = null`.

- [x] Case visual redesign (§25 ТЗ)
- [x] Case composition pass (markers, sparse recipes, case→case reveal)
- [x] Portfolio archive editorial listing + Home/Archive/Case handoffs
- [x] Persistent molecular shell (layout canvas + SpatialController)
- [x] Section route stubs + off-home chrome (header menu, transparent pages)
- [x] Полировка molecular → route: pose reveal gate, live same-atom handoff, parallel zoom/orbit tweens (не packed ease)
- [x] Case / section typography: Exo 2 body + Mono titles; `SiteScrambleTitle` chained to pose settle / case body idle
- [ ] Реальный контент `/about` `/services` `/contact` (WP pages / ACF)
