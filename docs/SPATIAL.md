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
| Canvas / molecule / HudFrame | layout, `position: fixed` | One renderer, scene, camera, rAF. Not remounted on navigation. |
| SiteHeader, nav rail, mobile overlay | chrome root | Persistent chrome. Home: SYS mark + molecule nav. Off-home: header route menu (direct hops); molecule nav / MENU hidden. USP + connectors home-only. |
| Route veil | `document.body` via `routeVeil` | Survives the hop; destination dismisses it. |
| Page content | `<NuxtPage />` | Archive / case / section content over the frozen molecule (no page scrim). |
| SiteChrome | page | Meta only (`ARCHIVE`, `CASE / NN`, Index). No duplicate grid / frame / logo. |

`html.hero-lock` (no document scroll) is applied only while spatial mode is `home`.

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
| `/portfolio/:slug` | `{ mode: 'case', context: 'portfolio', entityId }` |
| `/services` | `{ mode: 'service-archive', context: 'services' }` |
| `/services/:slug` | `{ mode: 'service', context: 'services', entityId }` |
| `/about`, `/contact`, other pages | `{ mode: 'section', sectionId }` (`sectionId` = first path segment) |

Stub pages: [`/about`](../app/pages/about.vue), [`/services`](../app/pages/services/index.vue), [`/contact`](../app/pages/contact.vue) — light overlay shells (`SectionShell`) so the molecule approach stays visible.

### Pose per mode

| Mode | Molecule | Pointer |
|---|---|---|
| `home` | Hub atom `C` focused (`restoreOverview`) with full readout (blurb + USP via `onHomeActivated`). Always committed — no unselected / empty rest. Zoom/fill at rest. | Unfrozen: mouse/touch tilt. |
| `section` | `focusSection(sectionId)` → matching nav atom, **held at approach** (zoom+fill = 1) | Frozen |
| `portfolio-archive` / `case` | `focusContext('portfolio')` → work atom `H3`, held at approach (atom fills the viewport) | Frozen |
| `service-archive` / `service` | `focusContext('services')` → `H2`, held at approach | Frozen |

`focusEntity` is reserved: entity id is stored on spatial state / debug; 3D framing stays on the context atom.

Home empty-canvas click / logo restore overview (`C`) and re-activate hub blurb + USP; it does not `clearFocus` into an empty rest. Hub π-flip runs only when retargeting onto `C` from another atom, not on initial home.

Off-home, header route menu navigates immediately (`transitionTo` without the zoom veil). On home the two-step gesture is unchanged (hover preview, first click commit+focus, second click `Navigator.navigateTo`). Second click on already-committed Home is a no-op. Home `navigateTo` **eases** desktop stage bias → screen center in the same GSAP approach pass as zoom+fill (no instant framing snap). Peripherals also get a full **orbit sweep** (2π about the atom's ring) during that approach — ends on the settled facing pose.

**Composition:** rest profiles are screen-centered. Hero desktop offset (`HOME_DESKTOP_FRAMING`, ~62% X) is a **home-only** framing override. Off-home and leave-home approach tween toward `CENTER_FRAMING`.

Off-home hops that **change the framed atom** (e.g. `/about` → `/contact`) run `Navigator.retargetApproach`: pullback (zoom+fill → 0, rest eases to **screen center**) → focus → re-approach (no end `holdApproach` snap — avoids a late twist jerk). Same-atom hops (Navigator handoff, archive↔case on the work atom) keep the live approach pose. Leaving rest / partial approach (`!isAtApproach`) runs `Navigator.approachTo` (animated focus → zoom+fill + orbit sweep on peripherals). Cold load / `immediate` / reduced motion snap `holdApproach`. Settled approach size follows sphere `atom.radius` (not orbit radius); peripherals share one radius so framed size matches across sections.

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
  useSpatialState updates
  SpatialController.apply
    Navigator.completeHandoff()   release busy / GSAP, keep canvas
    onModeChange → HUD + home-only desktop framing
    setMode + commit nav
    off-home:
      same atom at approach → leave live pose
      atom changed at approach → retargetApproach (pullback → focus → approach)
      not at approach → approachTo (animated focus → zoom+fill + orbit sweep)
      immediate / reduced motion → holdApproach snap
    freeze() if not home
  NuxtPage swaps content
layout unmount (rare: leave app / HMR)
  controller.dispose()
```

Production navigation must not create a second canvas, renderer, scene, camera, animation loop, pointer handler, or `MoleculeController`. `INSTANCE` on the spatial debug overlay increments only in the controller constructor.

After a forward `Navigator` hop: freeze + hide labels at approach start, then focus → **one approach** (zoom+fill together) → navigate **with no veil**. The live approach pose is held as-is. Home is the only mode that unwinds to rest. Direct load of `/portfolio` snaps to the same approach on the work atom.

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
