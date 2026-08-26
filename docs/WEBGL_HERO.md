# WebGL Hero Architecture

Fullscreen interactive molecule hero built with vanilla TypeScript and Three.js.

## Runtime flow

```
MolecularHero.vue (ClientOnly on /)
  └─ mountHeroApp.ts
        ├─ QualityManager          start HIGH (MEDIUM on coarse/narrow); ?quality= override
        ├─ canvas (#hero-canvas)
        ├─ MoleculeController  → mouse pointermove → absolute tilt + AtomHover NDC
        │                      → touch/pen drag → incremental tilt; tap → pick
        │                      → click → onAtomClick(atomId | null)  [mouse pick]
        │                      → rAF → compose + zoom/fill → labels (dirty) → selection → hover → onAfterUpdate
        │                         → render → PerformanceSampler (lock-once)
        │                         └─ Atom (Group: icosahedron + AtomSelectionIndicator) + AtomLabel / Bond / DecorativeNodes
        ├─ HudFrame / SiteHeader / UspHeadline / Navigation / MobileNavOverlay / NavigationConnector
        ├─ PerfOverlay             (dev-only, throttled DOM)
        ├─ NavigationState
        │     atomHover (raycast) · navHover (DOM) · committed (first click)
        ├─ subscribe(state)
        │     highlight + selection indicator + committed wireframe
        │     hover → highlight / pulse only (no focus)
        │     first click → setCommitted + focusAtom + typewriter blurb (troika) + arm USP
        │     second click same item → Navigator.navigateTo (zoom → fill → overlay)
        ├─ viewport MQ → setCompositionProfile(desktop|tablet|mobile) + connector.enable (desktop)
        │     onAfterUpdate → projectAtom → SVG elbow; USP tryReveal when isFocusSettled
        └─ Navigator.onNavigate
              ├─ item.route (≠ `/`) → TransitionController.transitionTo → Nuxt navigateTo
              └─ else → DestinationView stub (Return → cancel)
```

- **3D logic** lives under `app/lib/molecular/` and does not import DOM navigation or routes.
- **Pure math** (`app/lib/molecular/math/`) is side-effect free: `getStableFocusQuaternion` (writes into an `out` quaternion), `getFocusQuaternion`, `getAtomFocusDistance`, orientation, `projectToScreenInto`.
- **UI** (`app/lib/hero-ui/*`) never touches Three.js objects. HUD look: [`DESIGN.md`](DESIGN.md) (CSS `:root` tokens + decorative patterns). Title + typewriter blurb are a scene-parented screen-flat troika block (`AtomLabel`). USP headline is DOM (`UspHeadline` + `textScramble`) in the rail↔molecule / header↔molecule void.
- **3D vs screen-space:** Three.js owns the molecule world (atoms, bonds, captions, billboarded selection indicator, wireframe, decorative orbits/nodes) and viewport composition profiles. HTML/CSS/SVG owns grid, corners, header, USP headline, nav rail, mobile overlay, screen-space SVG connectors, transition veil. Bridge: world position → `projectToScreenInto` / `projectAtom` → CSS pixels. Do not drive atom locals from CSS sidebar width.
- **Page transition:** GSAP zoom stays in [`Navigator`](../app/lib/navigation/Navigator.ts); route hop is [`TransitionController.transitionTo`](../app/lib/navigation/TransitionController.ts) (handler registered in `MolecularHero.vue`). `work` → `/portfolio`. Other routes still use DestinationView stub until pages exist.
- **Wiring** lives in [`mountHeroApp.ts`](../app/lib/hero/mountHeroApp.ts) + [`MolecularHero.vue`](../app/components/molecular/MolecularHero.vue). Content pipeline: [`CONTENT.md`](CONTENT.md).

## Declarative config

### Molecule

Types in [`app/lib/molecular/types.ts`](../app/lib/molecular/types.ts):

| Type | Fields |
|------|--------|
| `AtomConfig` | `id`, `label` (chemical color key), optional `caption` (section word on the atom), `position`, `radius` |
| `BondConfig` | `id`, `from`, `to` (atom ids) |
| `MoleculeConfig` | `atoms[]`, `bonds[]` |

`MoleculeScene.buildMolecule` iterates config arrays (no hard-coded atom count). Test data: hub `C` at origin + peripherals in [`moleculeConfig.ts`](../app/lib/molecular/moleculeConfig.ts) at **equal spherical angles** about the hub (tetrahedron for 4; Fibonacci otherwise) on **individual** orbits with **varied radii** from [`moleculeOrbits.ts`](../app/lib/molecular/moleculeOrbits.ts) (`buildSphericalOrbitPlacements` / `ATOM_ORBIT_RADIUS`). IDs and bond graph stay stable.

### Navigation

[`navigationConfig.ts`](../app/lib/navigation/navigationConfig.ts):

| Type | Fields |
|------|--------|
| `NavigationItem` | `id`, `label`, `atomId`, `blurb`, `usp`, optional `route` |
| `NavigationConfig` | `items: NavigationItem[]` |

Helpers: `getItemById`, `getItemByAtomId`. Each nav item maps to exactly one molecule atom id. Atom `caption` is resolved from `navigationConfig` labels via `getItemByAtomId` in [`moleculeConfig.ts`](../app/lib/molecular/moleculeConfig.ts) — keep `items[].atomId` aligned with molecule atom ids; do not duplicate label strings.

## Navigation state

[`NavigationState`](../app/lib/navigation/NavigationState.ts) is the **single source of truth** for the active nav item.

```
activeItemId  = atomHover ?? navHover ?? committed
previewItemId = atomHover ?? navHover
focusItemId   = committed               ← click only; hover never centers
```

| Source | Writer | Role |
|--------|--------|------|
| `atomHoverItemId` | `setAtomHover` (raycast) | Hover preview |
| `navHoverItemId` | `setNavHover` (nav `pointerenter`) | Same preview from the overlay |
| `committedItemId` | first click (`selectItem`) | Sticky zoom + frozen selection reticle + typewriter readout |

Two-step gesture (app layer in `mountHeroApp.ts`, not inside Three.js):

1. **Hover** (atom raycast or nav): highlight + pulsing selection reticle. **No** `focusAtom`.
2. **First click** (atom or nav): `setCommitted` + `focusAtom` + freeze reticle + typewriter blurb on the atom + arm USP (scramble after `isFocusSettled`).
3. **Second click on the same item**: `navigator.navigateTo(atomId)` (zoom → fill → overlay).
4. **Click another item**: retarget commit + focus (not a page transition).
5. **Empty canvas click**: `clearFocus` / clear commit; `cancel()` if a transition is busy.

While committed, hover of another item only updates nav highlight — it does not steal focus or zoom.

## Orientation (three quaternion layers + focus strength)

Molecule orientation is composed from independent **absolute** layers — **do not** overwrite one quaternion with another or accumulate `+=` deltas:

```
appliedFocus = slerp(I, focusOrientation, focusStrength)
final = appliedFocus × mouseOrientation × baseOrientation
```

| State | Location | Role |
|-------|----------|------|
| `baseOrientation` | `MoleculeController` | Rest pose (identity for now) |
| `mouseOrientation` | `MoleculeController` | Smoothed limited yaw/pitch from pointer |
| `targetMouseOrientation` | `MoleculeController` | Absolute target from latest normalized pointer |
| `focusOrientation` | `MoleculeController` | Smoothed atom→camera focus pose |
| `targetFocusOrientation` | `MoleculeController` | Absolute target from latest `focusAtom(atomId)` |
| `focusStrength` | `MoleculeController` | Blend weight in `[0, 1]` (smoothed toward `targetFocusStrength`) |
| `targetFocusStrength` | `MoleculeController` | `1` while focused, `0` after `clearFocus` |

Follow rates (`MOUSE_FOLLOW`, `FOCUS_ORIENT_FOLLOW`, `FOCUS_STRENGTH_FOLLOW`) use frame-rate independent damping `1 - exp(-k·Δt)`.

### Mouse layer

1. `pointermove` → normalize client coords to `[-1, 1]` (composition bias = `0,0`).
2. `updateMouseInfluence(pointer)` → yaw about +Y and pitch about +X via `setFromAxisAngle`, then `targetMouse = qYaw × qPitch` (no Euler).
3. Each frame: attenuate the mouse target by focus — `mouseScale = 1 - focusStrength * (1 - MOUSE_UNDER_FOCUS)` with `MOUSE_UNDER_FOCUS = 0.22`, then slerp `mouseOrientation` toward that attenuated target (`MOUSE_FOLLOW`).

Focus orientation stays dominant; under focus the pointer remains a **subtle secondary** tilt so the molecule does not freeze and the selected atom stays in the focus zone. Screen center restores mouse identity. Max angles capped (`MAX_YAW` / `MAX_PITCH`). Scratch quaternions / vectors reused (no per-frame allocations for those paths).

### Focus layer

1. `focusAtom(atomId)` → rest-frame atom position (`local + moleculeWorld`) + camera world position.
2. `getStableFocusQuaternion(..., out = targetFocusOrientation)` (reference = current `focusOrientation`); set `targetFocusStrength = 1`.
3. `clearFocus()` → `targetFocusStrength = 0` only (keeps last focus pose; influence fades via strength).
4. Each frame: slerp focus orientation (`FOCUS_ORIENT_FOLLOW`), damp `focusStrength`, build `appliedFocus`, compose with attenuated mouse and base, apply to `moleculeGroup`.

Focus follows **click commit** only. Hover never calls `focusAtom`. Mouse keeps applying under focus at reduced amplitude.

**Stable focus math** (`getStableFocusQuaternion`): builds RH orthonormal bases with `+Z = forward` (FROM: atomDir in rest space; TO: cameraDir in world). World up-hint is `referenceQuaternion * localUp`, so twist about the view axis stays close to the current focus orientation. `R = M_to · M_from⁻¹`. No Euler. Degenerate cases (zero atom/camera dir, `up ∥ forward`) copy the reference into `out` or pick an alternate axis. Callers pass a persistent `out` quaternion — no allocation on the focus path.

`getFocusQuaternion` remains as the unconstrained `setFromUnitVectors` baseline; production path uses the stable variant.

## Zoom and fill (scene verbs)

Zoom writes **`moleculeGroup.position` only** — not mixed into quaternion layers. Camera FOV / position stay fixed.

| State | Role |
|-------|------|
| `zoomProgress` / `targetZoom` | `[0, 1]` framing toward the zoom atom |
| `fillProgress` | Extra proximity beyond base framing (atom overflows viewport) |
| `zoomAtomId` | Atom used for framing; cleared when zoom settles at 0 |

Framing distance: [`getAtomFocusDistance`](../app/lib/molecular/math/getAtomFocusDistance.ts) from atom radius + camera FOV (`viewportFill` lerps from base `0.9` toward `1.35` as `fillProgress` → 1). The controller mutates a persistent `focusDistanceOptions` bag each zoom frame (no options-object allocation).

Public scene API (no routes): `focusAtom`, `clearFocus`, `isFocusSettled`, `zoomToAtom`, `clearZoom`, `prepareTransitionTarget`, `setZoomProgress`, `setFillProgress`, `setTransitionDriven`, `setHighlightedAtom`, `setHaloAtom`, `setWireframeAtom`, `setCaptionsCompact`, `setCaptionRemainderScale`, `setCompositionProfile`, `setCompositionBias`, `projectAtom`, `onAfterUpdate`.

Zoom-in waits until `isFocusSettled()` (`focusStrength ≥ 0.92` and orientation within `0.08` rad of target). The same gate starts the HUD USP scramble after commit.

### Composition profiles

[`composition/profiles.ts`](../app/lib/molecular/composition/profiles.ts) defines `desktop` / `tablet` / `mobile` rest framing. `setCompositionProfile` writes `baseMoleculePosition` from viewport fractions `screenX` / `screenY` (camera right / up) plus `approach` (pull toward camera along look). Derived from FOV + aspect + look-at distance — **never** from measuring CSS chrome. Atom locals stay unchanged. Recomputed on resize. Zoom still layers on top of this rest translation.

| Mode | screenX | screenY | approach |
|------|---------|---------|----------|
| desktop | 0.62 | 0.45 | 0 |
| tablet | 0.50 | 0.47 | 0.12 |
| mobile | 0.50 | 0.56 | 0.28 |

**Mobile compact layout** (`MoleculeScene.setCompactLayout`): when mode is `mobile`, orbit span ×0.58; hub radius ×0.58; peripheral radii ×0.78 (peripherals read larger relative to the compact molecule). Hub caption font scales to match peripheral caption size (`peripheral.baseRadius / hub.baseRadius` via `AtomLabel.setFontScale`). Bonds + decorative orbits follow orbit scale. Desktop/tablet keep authored layout.

Committed atom titles use bright ink; idle titles are pure black (`0x000000`) so they do not compete with the focused caption.

### Pointer / touch

- **Mouse (fine):** window `pointermove` absolute tilt around the composition center; canvas `click` raycasts. Canvas cursor: `crosshair` default, `pointer` over atom meshes (`#hero-canvas.is-atom-hover` from `onAtomHover`).
- **Touch / pen:** canvas capture; movement &lt; ~10px → tap pick; larger → incremental yaw/pitch drag (clamped to the same `MAX_YAW` / `MAX_PITCH`). Synthetic click after touch is suppressed. Canvas `touch-action: none`.
- Nav / overlay items use [`tapGuard`](../app/lib/hero-ui/tapGuard.ts) so horizontal scroll-drag does not fire selection.

When `setTransitionDriven(true)`, local zoom damping is skipped — `Navigator` owns progress via GSAP.

### Navigation connector bridge

[`NavigationConnector`](../app/lib/hero-ui/NavigationConnector.ts) polls `projectAtom` in `onAfterUpdate`, reads sidebar anchors from `Navigation.getItemAnchor`, and draws an orthogonal SVG elbow. Endpoint tracks projection synchronously (no lag). Tip + tiny marker stop short of the atom. Idle / hover / active / zoom fade; soft distance fade when the span is extreme. Desktop-only (`≥1024`).

### USP headline

[`UspHeadline`](../app/lib/hero-ui/UspHeadline.ts) + [`textScramble`](../app/lib/hero-ui/textScramble.ts): short RU USP from `navigationConfig.items[].usp`. Armed on first-click commit; scramble starts only after `controller.isFocusSettled()`. Uppercase tracked type; ~1s scramble + fade-in. Mobile type is larger than atom captions (`--text-usp` ~1.45–2rem). A hidden measure span (CSS grid stack) locks final line breaks; scramble picks glyphs only from the target string so width stays stable. Fades with the same zoom/fill softness as the connector. Cleared on empty-canvas deselect. Hover never arms USP. `prefers-reduced-motion` snaps to the final string.

## Page transition (`Navigator` + `TransitionController`)

[`Navigator`](../app/lib/navigation/Navigator.ts) owns a GSAP timeline and [`TransitionState`](../app/lib/navigation/TransitionState.ts). Overlay: [`TransitionOverlay`](../app/lib/hero-ui/TransitionOverlay.ts) acquired via [`routeVeil`](../app/lib/navigation/routeVeil.ts) and parented to `document.body` so it can survive hero unmount. Route hop: [`TransitionController`](../app/lib/navigation/TransitionController.ts).

| API | Role |
|-----|------|
| `navigateTo(atomId)` | Interruptible retarget: focus → zoom → fill → overlay; durations scale from live progress |
| `onNavigate(atomId)` | Forward-only cue at the timeline navigate label |
| `transitionTo(route)` | Nuxt `navigateTo` (handler set in `MolecularHero`); after `handoffRouteVeil()` for real routes |
| `cancel()` | Unwind overlay → fill → zoom → clear focus (soft reset; no hard state tear-down) |

Phases: `idle` → `focus` → `zoom` → `fill` → `overlay` → `complete` (stays busy at destination so hover focus cannot fight the pose).

**Current wiring:** first click focuses (`focusAtom`), types the blurb, and arms the USP; USP scrambles after `isFocusSettled()`. Second click on the same atom/nav item calls `navigateTo` (zoom starts here). At the navigate label: if `NavigationItem.route` is set and not `/` (e.g. `/portfolio`), `handoffRouteVeil()` then `transitionTo`; otherwise show [`DestinationView`](../app/lib/hero-ui/DestinationView.ts) stub (**Return** → `cancel()`). Archive dismisses the handed-off veil (opacity). Empty canvas click clears commit (and `cancel()` if a transition is busy).

`prefers-reduced-motion`: skip zoom/fill/connector; set veil opacity 1 and hop immediately. Pointer tilt on the molecule is also off. Shared helper: [`prefersReducedMotion`](../app/lib/a11y/reducedMotion.ts). Full Home/Archive/Case table: [`CASES.md`](CASES.md) § Page transitions.

## Hover picking, highlight, and selection

[`AtomHover.ts`](../app/lib/molecular/AtomHover.ts): raycasts **atom meshes only** (`MoleculeScene.getAtomMeshes()`). Dirty when pointer NDC changes, molecule quaternion / zoom progress changes, or resize. Enter/leave notifies `mountHeroApp.ts` → `NavigationState.setAtomHover`. Selection rings are siblings of the icosahedron on the atom **Group** (not children of the scaled mesh); labels live on `labelsGroup` (scene). Neither is in `atomMeshes` (empty `raycast`). Decorative ghost geometry and the selection wireframe are also not pick targets.

Highlight is separate from focus orientation: `setHighlightedAtom` toggles a light emissive. Selection mode (`idle` / `hover` pulse / `committed` freeze) is set via `setHaloAtom`. The selected wireframe shell follows **committed** only (`setWireframeAtom`); hover must not show it. Nav `.is-active` follows `activeItemId`; `.is-committed` follows `committedItemId`.

## Quality and performance

[`QualityManager`](../app/lib/molecular/quality/QualityManager.ts) is the lock-once source of truth (`high` | `medium` | `low`). It does **not** retune on resize, hover, or tab blur.

| Level | maxPixelRatio | atomDetail | wireframe | rings | ticks | decorative | material |
|-------|---------------|------------|-----------|-------|-------|------------|----------|
| HIGH | 1.75 | 1 | yes | 3 | yes | yes | `MeshStandardMaterial` |
| MEDIUM | 1.5 | 1 | yes | 2 | no | no | `MeshStandardMaterial` |
| LOW | 1 | 0 | no | 2 | no | no | `MeshLambertMaterial` |

Pixel ratio is always `Math.min(devicePixelRatio, settings.maxPixelRatio)` — never raw `window.devicePixelRatio`.

Startup: HIGH, or MEDIUM when `pointer: coarse` or width ≤ 767. `?quality=high|medium|low` skips sampling and locks that level.

[`PerformanceSampler`](../app/lib/molecular/quality/PerformanceSampler.ts) (after first `render` in `tick`):

1. Skip ~8 warmup frames
2. Record ~45 rAF deltas (already clamped to 50 ms)
3. p95 &lt; 18 ms → HIGH; &lt; 28 ms → MEDIUM; else LOW — **never above** the start heuristic
4. Lock, then watch ~2 s; **one** extra downgrade if still over the current threshold
5. Stop forever

Quality changes call `MoleculeScene.applyQuality` **in place** (swap shared icosahedron geometry, selection ring count, wireframe, decorative visibility, material flavor, pixel ratio). Do **not** `buildMolecule` again — that would drop hover / commit / focus / zoom.

[`GeometryCache`](../app/lib/molecular/resources/GeometryCache.ts) owns unit icosahedron (per detail), edges, unit selection circle / ticks / cross. Atoms keep unique matte flat-shaded materials (emissive highlight). Bonds are dashed `Line`s with a shared `LineDashedMaterial` and per-bond geometry. Cache `dispose()` runs on scene teardown; atom `dispose()` must not dispose shared geometry; bond `dispose()` frees its own line geometry.

Renderer stays a plain `WebGLRenderer` (antialias on, no shadows, no EffectComposer / bloom / SSAO / env maps). Antialias is constructor-only; pixel ratio is the resolution lever.

Dev overlay: [`PerfOverlay`](../app/lib/debug/PerfOverlay.ts) — FPS, frame time, quality, pixel ratio. Mounts when `import.meta.env.DEV && DEBUG_PERF`. Flip `DEBUG_PERF` to `false` or `?debug=0` to hide. DOM text updates ~4 Hz, not every frame.

## Key modules

| File | Role |
|------|------|
| `MoleculeScene.ts` | Scene, camera, renderer, lights, fog, `buildMolecule`, `applyQuality`, dirty-gated labels, selection tick |
| `MoleculeController.ts` | rAF, pointer / touch / viewport resize, orientation layers, zoom/fill, composition profile, pick, `projectAtom`, selection/caption/wireframe APIs, sampler |
| `composition/profiles.ts` | desktop / tablet / mobile framing (`screenX` / `screenY` / `approach`) |
| `quality/QualityManager.ts` | Lock-once quality presets; `?quality=` / coarse-pointer start heuristic |
| `quality/PerformanceSampler.ts` | Startup sample → lock + one emergency downgrade |
| `resources/GeometryCache.ts` | Shared unit icosahedron / edges / circle / ticks / cross |
| `moleculeOrbits.ts` | One hub orbit per peripheral (varied radius); equal spherical angles |
| `AtomHover.ts` | NDC raycast pick; enter/leave listeners |
| `math/focusAtom.ts` | `getStableFocusQuaternion`, `getFocusQuaternion`, camera-framing helper |
| `math/getAtomFocusDistance.ts` | FOV-based distance so an atom radius covers a viewport fraction |
| `math/projection.ts` | `projectToScreenInto` (scratch) / `projectToScreen` |
| `Atom.ts` / `Bond.ts` / `AtomLabel.ts` / `AtomSelectionIndicator.ts` | Group+flat icosahedron, dashed line, two-part caption (JetBrains Mono ttf via troika + `BASE_URL`), screen-flat reticle |
| `DecorativeNodes.ts` | HIGH-only unpickable ghost (one hub orbit per atom + wireframe fragments); idle orbits black, active orbit dark gray via `setActiveOrbitAtom`; fades with zoom/fill |
| `moleculeConfig.ts` / `types.ts` | Declarative molecule data; captions pulled from nav labels |
| `navigation/navigationConfig.ts` | RU `NavigationItem[]` + blurbs + USPs + id/atom lookups |
| `navigation/NavigationState.ts` | atomHover + navHover + committed; `focusItemId`; subscribe |
| `navigation/Navigator.ts` | GSAP page-transition coordinator; `navigateTo` / `onNavigate` / `cancel` |
| `navigation/routeVeil.ts` | Body-parented overlay acquire / handoff / dismiss across home unmount |
| `navigation/archiveReturn.ts` | `sessionStorage` restore of archive `?page=` + scroll |
| `navigation/TransitionController.ts` | `transitionTo(route)` → Nuxt (handler from MolecularHero) |
| `navigation/TransitionState.ts` | Centralized transition phase / progress snapshot |
| `hero-ui/HudFrame.ts` | Grid + corner ticks (pointer-events none) |
| `hero-ui/SiteHeader.ts` | Desktop logo / `⟨ SYS · МОЛЕКУЛА ⟩` (viewport center) / NODE; mobile LOGO + MENU / NAV |
| `hero-ui/UspHeadline.ts` / `hero-ui/textScramble.ts` | HUD USP scramble after focus settle |
| `hero-ui/MobileNavOverlay.ts` | Editorial full-screen mobile nav index |
| `hero-ui/Navigation.ts` | Bottom bar (≤1023) or left rail (≥1024); `getItemAnchor`; zoom softness |
| `hero-ui/tapGuard.ts` | Tap vs scroll-drag for nav controls |
| `hero-ui/NavigationConnector.ts` | SVG elbow; sync `projectAtom` follow; idle/hover/active/zoom |
| `hero-ui/DestinationView.ts` | Stub section + Return (routes without pages yet) |
| `hero-ui/TransitionOverlay.ts` | Full-viewport veil opacity |
| `debug/PerfOverlay.ts` | Dev-only throttled FPS / quality HUD |
## Scene constraints (current stage)

- Canvas fills the viewport (`100%` / `100dvh`); background `--color-bg` / `0x14161c`. Home locks document scroll via `html.hero-lock`.
- Techno HUD overlay (grid, corners, header, nav rail, mobile overlay, SVG connector) — see [`DESIGN.md`](DESIGN.md). `NavigationItem.route` drives Nuxt when wired (`/portfolio`); other items still use DestinationView stub.
- Responsive: desktop ≥1024 (rail + header + composition profile + connector; full captions), tablet 768–1023 (bottom nav, tablet framing, smaller remainder), mobile ≤767 (header + compact rail + MENU overlay, mobile framing, full captions, touch drag/tap).
- No postprocessing, bloom, particle systems, physics, realtime shadows, or environment maps. Scene uses a matching `Fog` for slight depth only.
- Pixel ratio capped by the locked quality preset (`maxPixelRatio` 1.75 / 1.5 / 1), refreshed on every resize (monitor / OS DPR changes). Mobile starts MEDIUM (DPR ≤1.5, no ghosts/ticks); sampler may lock LOW (DPR 1, no wireframe). Never disable rotation, touch, raycast, focus, labels, zoom, or navigation.
- GSAP drives the page-transition timeline; idle spin is unused.
## Render-loop hygiene

Separate concerns so nothing hidden reallocates every frame:

| Layer | What |
|--------|------|
| **PER FRAME** | Quaternion follow, zoom translation, one `moleculeGroup.updateMatrixWorld(true)`; connector `projectAtom` + SVG update in `onAfterUpdate` |
| **POINTER** | Raycast only when `AtomHover` is dirty (NDC or pose change) |
| **TRANSFORM DEPENDENT** | Labels when orientation / `zoomProgress` / `fillProgress` changed |
| **STATE DRIVEN** | Highlight / selection / wireframe / blurb / nav from `NavigationState` (`mountHeroApp.ts`) |
| **DECORATIVE** | Selection pulse (early-out when idle); ghost layer HIGH-only, fades with zoom/fill |

| Kind | What |
|------|------|
| **Persistent** | Quaternion layers, zoom/fill, base position, hover/label dirty caches, `focusDistanceOptions` |
| **Temporary (scratch)** | Module/instance `Vector3` / `Quaternion` / `Matrix4` reused across focus math, compose, zoom, labels |
| **Render-time** | Compose → zoom translation → **one** matrix update → dirty-gated labels → selection → dirty-gated hover → `onAfterUpdate` → `render()` → sampler |

Frame order after transforms: single forced matrix update, then labels (only when orientation / `zoomProgress` / `fillProgress` changed, or after resize), then selection indicator (pulse needs elapsed time; skip billboard when idle), then hover (no second matrix force). `projectToScreenInto` uses module/instance scratches. Zoom measurement may still force a matrix pass while measuring the atom at rest translation. HUD / nav / overlay stay off the rAF path.

Resize sizing prefers `window.visualViewport` when present, else `innerWidth` / `innerHeight`. Listeners: `resize`, `orientationchange`, and `visualViewport` `resize` / `scroll` (torn down in `stop()`).

## Build & deploy

| Target | Command | `base` |
|--------|---------|--------|
| Local dev / preview | `npm run dev`, `npm run build`, `npm run preview` | `/` |
| GitHub Pages | push to `main` → [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) (`GITHUB_PAGES=true`) | `/molecule/` |

Live site: [proto0654.github.io/molecule](https://proto0654.github.io/molecule/). Fonts live in `public/fonts/` (copied to dist root).

**Subpath gotcha:** Vite rewrites CSS `url('/fonts/…')` at build time, but **JS string literals are not**. Troika and any runtime fetch must prefix with `import.meta.env.BASE_URL` (trailing slash included). Hard-coded `/fonts/JetBrainsMono-Regular.ttf` works locally and 404s on GitHub Pages.

## Gotchas

- Bond connectors are dashed `Line`s inset from atom radii; `computeLineDistances()` is required for `LineDashedMaterial`. Not pick targets.
- Atom materials are matte + `flatShading` (HIGH/MEDIUM standard, LOW lambert). Do not reintroduce Fresnel or high metalness — facets must stay readable.
- Peripheral positions and decorative orbits must stay in sync via [`moleculeOrbits.ts`](../app/lib/molecular/moleculeOrbits.ts) (`ATOM_ORBIT_PLACEMENT` / `buildSphericalOrbitPlacements`). Each peripheral owns one hub-centered orbit (varied radius); directions use equal spherical spacing (not a shared ecliptic). Do not share one ring across multiple atoms or hard-code XYZ. Active orbit color follows highlight via `setActiveOrbitAtom` (black idle / dark gray active).
- Atom colors are a local `COLOR_BY_LABEL` map in `Atom.ts`, not part of `AtomConfig`.
- `AtomLabel`: parented to `labelsGroup` on the **scene**, not the atom mesh. World position follows the atom; `quaternion.copy(camera.quaternion)` keeps the plane screen-flat (no off-axis foreshortening); scale = distance / 4.5 keeps pixel size stable. First letter centered on the surface point toward the camera; remainder `+X`; blurb under the title. Mobile: `setBlurbWrapAtSlash(true)` breaks the typewriter line at the content ` / ` separator; hub `setFontScale` matches peripheral caption pixel size (authored hub radius is larger). Do not parent labels to the mesh or `lookAt` from a rotated parent.
- `AtomSelectionIndicator`: concentric `LineLoop`s + ticks + center cross parented to the atom **Group**; **screen-flat billboard** via camera quaternion composed against parent world quaternion (not world-tilted); `depthTest` on; not in `atomMeshes`. Quality hides extra rings / ticks; LOW skips the pulse scale wave.
- Atom rest-frame position for focus is `atom.object.position` (the Group), not `mesh.position` (local origin after the unit-icosahedron scale wrap).
- Shared geometries live in `GeometryCache` — do not `geometry.dispose()` on atom/selection teardown. Bond lines own their geometry and dispose it in `Bond.dispose()`. `applyQuality` must not call `buildMolecule`.
- Wireframe shell is decorative and committed-only; quality may disable it. Never add it to `atomMeshes`.
- Keep `navigationConfig.items[].atomId` aligned with molecule atom ids. Captions/blurbs/USPs/labels are authored once in `navigationConfig` (Russian); `moleculeConfig` reads captions via `getItemByAtomId`.
- Troika captions load JetBrains Mono ttf via `import.meta.env.BASE_URL` + `fonts/JetBrainsMono-Regular.ttf` (Cyrillic). HUD CSS uses the matching `.woff2` from `public/fonts/`. Do not point troika at woff2.
- Hover may **not** call `focusAtom` — only highlight / selection reticle. Focus comes from `committed` (first click). Zoom starts on the second click via `navigateTo`.
- USP reveal shares `isFocusSettled()` with zoom-in. Arm on commit; do not scramble on hover or before the gate. Fade USP with zoom/fill; dispose with other HUD on HMR. Scramble must use a hidden measure layer + target-only charset — a wide random charset or live `textContent` reflow will jump lines (especially on mobile where the block is vertically centered).
- Do not put route / history / `navigateTo` inside `MoleculeController` click handling — pick notifies; app layer decides.
- Mid-flight `navigateTo` retargets without hard-resetting zoom/fill/overlay; `cancel` builds an unwind timeline from live values (do not `timeline.reverse()` after a retarget that started mid-progress).
- While `Navigator.busy` (including `complete`), `mountHeroApp.ts` skips hover-driven focus updates.
- Focus uses **rest-frame** atom position (ignore current group rotation) so the focus quaternion stays absolute and independent of the mouse layer.
- `setCompositionProfile` must use FOV/aspect only — never `getBoundingClientRect` on the sidebar. Atom locals stay fixed. Prefer profiles over ad-hoc `setCompositionBias`.
- `NavigationConnector` consumes screen pixels only (`projectAtom` + DOM anchors). Do not import scene graph objects into UI modules. Tip + tiny marker stop short of the atom.
- Desktop rail / header / connector are CSS ≥1024; tablet keeps bottom nav; mobile uses header + compact rail + MENU overlay and hides the connector.
- `clearFocus` only lowers `focusStrength`; do not slerp focus orientation to identity on leave (avoids a long unused arc).
- Central / Home atom (zero offset): no unique focus forward — on enter, apply a π flip about a random axis from the current focus pose (idempotent while already focused on hub). Peripheral focus still uses `getStableFocusQuaternion`. `focusAtom` also clears residual pointer/touch tilt so the atom faces the camera.
- Do not write `moleculeGroup.rotation.x/y += …`; apply composed absolute layers each frame (no rotation accumulation).
- Do not `new Vector3` / `new Quaternion` / options literals inside `tick` / `update` — use scratches and persistent options bags.
- Hover stays dirty every frame while orientation/zoom is still damping (correct under a still pointer); idle settled frames do not raycast.
- Dispose path: HMR / home unmount disposes navigator, destination, USP, hud, nav, controller. `Navigator.dispose()` kills the timeline and calls `releaseRouteVeil()` — the overlay is **not** removed if it was handed off to the destination page. `MoleculeScene.dispose` clears meshes, `renderer.dispose()`, then `forceContextLoss()`.
- Graphite colors in `COLOR_BY_LABEL` must stay darker than caption ink (see [`DESIGN.md`](DESIGN.md) scene tokens).
