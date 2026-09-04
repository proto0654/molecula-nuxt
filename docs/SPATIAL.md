# Persistent spatial shell

The molecule is the visual shell of the Nuxt app, not a home-only hero. Route changes swap [`<NuxtPage />`](../app/layouts/default.vue) content. The Three.js instance stays alive.

## App shell

```
app.vue
  NuxtLayout (layouts/default.vue — persists across routes)
    app-shell
    ├── MolecularHero (ClientOnly)
    │     ├── .molecular-hero   canvas + HudFrame          z-stage
    │     └── .molecular-chrome header, nav, USP, overlays z-chrome
    └── .app-shell__page
          └── NuxtPage                                     z-page
```

| Layer | Lives | Notes |
|---|---|---|
| Canvas / molecule / HudFrame | layout, `position: fixed` (`100lvw` × `100lvh`) | One renderer, scene, camera, rAF. Not remounted on navigation. Large viewport units keep the stage stable when mobile browser chrome toggles. |
| SiteHeader, nav rail, mobile overlay | chrome root (`100lvw` × `100lvh`) | Persistent chrome. Home: header slide progress (desktop) + nav progress above bottom rail (mobile) + molecule nav. Off-home desktop/tablet: centered header route links (direct hops). Off-home mobile: LOGO + MENU + overlay (direct hops). Molecule rail hidden off-home. USP + connectors home-only. |
| Route veil | `document.body` via `routeVeil` | Survives the hop; destination dismisses it. |
| Page content | `<NuxtPage />` | Archive / case / section content over the frozen molecule (no page scrim). |
| SiteChrome | page | Meta only (`ARCHIVE`, `CASE / NN`, Index). No duplicate grid / frame / logo. |

`html.hero-lock` (no document scroll, `100dvh`) is applied only while spatial mode is `home`. `scrollbar-gutter: stable both-edges` on `html` keeps viewport width stable across home ↔ off-home hops. Stage/chrome stay on `lvh`/`lvw`; document height stays on `dvh`.

## State machine

Single source: [`spatialFromRoute`](../app/lib/spatial/spatialFromRoute.ts) → [`SpatialState`](../app/lib/spatial/types.ts). Components must not parse `route.path` to pose the molecule.

```
type SpatialMode =
  | 'home'
  | 'section'
  | 'portfolio-archive'
  | 'service-archive'
  | 'case'
  | 'service'

type SpatialState = {
  mode: SpatialMode
  sectionId?: string
  context?: 'portfolio' | 'services'
  entityId?: string
}
```

[`SpatialController.apply`](../app/lib/spatial/SpatialController.ts) is the only writer of molecule verbs from routing. [`MoleculeController`](../app/lib/molecular/MoleculeController.ts) does not know URLs.

```
useSpatialState()  (Vue, watches useRoute)
        │
        ▼
spatialFromRoute(path)     pure
        │
        ▼
SpatialController.apply    nav commit + freeze/focus
        │
        ▼
MoleculeController         setMode / restoreOverview / focus* / freeze
```

## Route → spatial mapping

| Route | State |
|---|---|
| `/` | `{ mode: 'home' }` |
| `/portfolio` | `{ mode: 'portfolio-archive', context: 'portfolio' }` |
| `/portfolio/legacy` | `{ mode: 'portfolio-archive', context: 'portfolio' }` (not a case slug) |
| `/portfolio/:slug` | `{ mode: 'case', context: 'portfolio', entityId }` |
| `/services` | `{ mode: 'service-archive', context: 'services' }` |
| `/services/:slug` | `{ mode: 'service', context: 'services', entityId }` |
| `/about`, `/contact`, other pages | `{ mode: 'section', sectionId }` (`sectionId` = first path segment) |

[`/about`](../app/pages/about.vue), [`/contact`](../app/pages/contact.vue), and [`/services`](../app/pages/services/index.vue) are live WP content (`/services/:slug` for a service). Contact data comes from ACF options (`weblaba_contacts`), not a WP page.

### Pose per mode

| Mode | Molecule | Pointer |
|---|---|---|
| `home` | Hub atom `C` focused (`restoreOverview`) with full readout (blurb + USP via `onHomeActivated`). Always committed — no unselected / empty rest. Zoom/fill at rest. | Unfrozen: mouse/touch tilt. |
| `section` | `focusSection(sectionId)` → matching nav atom, **held at approach** (zoom+fill = 1, planet framing per atom) | Frozen |
| `portfolio-archive` / `case` | `focusContext('portfolio')` → work atom `H3`, held at approach (planet from bottom) | Frozen |
| `service-archive` / `service` | `focusContext('services')` → `H2`, held at approach (planet from top) | Frozen |

`focusEntity` is reserved: entity id is stored on spatial state / debug; 3D framing stays on the context atom.

Home empty-canvas click / logo restore overview (`C`) and re-activate hub blurb + USP; it does not `clearFocus` into an empty rest. Hub π-flip runs only when retargeting onto `C` from another atom, not on initial home.

Off-home, header route menu commits the URL immediately (`transitionTo`); the page overlay stays hidden (`is-awaiting-pose`) until the molecule pose settles. On **home**, **header route links and mobile MENU** call `Navigator.navigateTo` in one shot (parallel orbit sweep + zoom/fill + framing → route-specific **planet framing**, then `transitionTo` at the navigate label — no atom commit step). The **nav rail** and **canvas atom clicks** keep the two-step gesture (first click commit+focus+prefetch, second click `navigateTo`). Second click on already-committed Home is a no-op. Leave-home `navigateTo` has **no separate focus-only beat** — facing, zoom/fill, framing, and orbit sweep start in the same GSAP beat.

**Composition:** rest profiles are screen-centered. Hero desktop offset (`HOME_DESKTOP_FRAMING`, ~62% X) is a **home-only** framing override. Off-home settled approach uses **planet-in-frame** framing per atom ([`approachFraming.ts`](../app/lib/molecular/composition/approachFraming.ts)): Services `H2` top, Portfolio `H3` bottom; About `H1` and Contact `H4` use **screen center** (classic full approach). Leave-home and `approachTo` tween framing toward that target in parallel with zoom/fill. Off-home retargets use the same parallel choreography (planet → planet or planet → center, partial zoom dip).

Off-home hops that **change the framed atom** (e.g. `/about` → `/contact`) run `Navigator.retargetApproach`: parallel focus + zoom dip + framing tween (planet → planet, no idle focus beat — same unified feel as leave-home). Same-atom hops (Navigator handoff, archive↔case on the work atom) keep the live approach pose. Leaving rest / partial approach (`!isAtApproach`) runs `Navigator.approachTo` (animated focus → zoom+fill + orbit sweep on peripherals). Cold load / `immediate` / reduced motion snap `holdApproach`. Settled approach size follows sphere `atom.radius` (not orbit radius); peripherals share one radius so framed size matches across sections.

## Three.js lifecycle

```
layout mount (once)
  MolecularHero onMounted
    mountHeroApp
      QualityManager
      canvas + MoleculeController.start()   ← one rAF loop
      HUD / Navigator / SpatialController
      applySpatial(initial, { immediate: true })
route change
  router.beforeEach → arm `is-awaiting-pose` (leave-home / atom change)
  NuxtPage may mount under opacity 0
  useSpatialState updates
  SpatialController.apply
    live Navigator approach to same atom → skip completeHandoff (GSAP keeps running)
    otherwise completeHandoff() aborts a foreign timeline (keep canvas + zoom/fill)
    onModeChange → HUD + home-only desktop framing
    setMode + commit nav
    off-home:
      live approach → leave Navigator in charge
      same atom at approach → leave live pose
      atom changed at approach → retargetApproach (pullback → focus → approach)
      not at approach → approachTo (animated focus → zoom+fill + orbit sweep)
      immediate / reduced motion → holdApproach snap
    freeze() if not home
  Navigator idle + pose settled → drop `is-awaiting-pose` (CSS fade)
layout unmount (rare: leave app / HMR)
  controller.dispose()
```

Production navigation must not create a second canvas, renderer, scene, camera, animation loop, pointer handler, or `MoleculeController`. `INSTANCE` on the spatial debug overlay increments only in the controller constructor.

After a forward `Navigator` hop: freeze + hide labels at approach start, then focus → **parallel approach** (zoom+fill + framing + orbit) → navigate **with no opaque veil**. When the timeline is idle and the canvas stays frozen, selection rings / cross / wireframe **lerp to black** (cancelled on home `unfreeze` or while `busy` during retarget). Route commit is not visual reveal: `.app-shell.is-awaiting-pose` keeps `<NuxtPage>` at opacity 0 until the timeline is idle. `completeHandoff` is an abort for a *different* destination — it must not kill a live approach to the same atom. While `transitionDriven`, local zoom damping must not clear `zoomAtomId`. Home is the only mode that unwinds to rest. Direct load of `/portfolio` snaps to the same approach on the work atom. Same-atom hops (archive↔case) do not wait on the molecule; in-page case choreography stays in `useCasePageTransition`. Archive ↔ detail mode changes on the same atom call `SpatialController.maybeCueArchiveTransition` → depth light sweep toward/away from the viewer (no spin).

## Debug

Dev-only [`SpatialOverlay`](../app/lib/debug/SpatialOverlay.ts) (`DEBUG_SPATIAL`, hidden when `?debug=0`):

```
MODE     CASE
TARGET   H3
CONTEXT  WORK
ENTITY   project-slug
INSTANCE 1
```

Kill switch: set `DEBUG_SPATIAL = false` or append `?debug=0`.

## Related

Scene math and home HUD wiring: [`WEBGL_HERO.md`](WEBGL_HERO.md). Archive / case overlay: [`CASES.md`](CASES.md).
