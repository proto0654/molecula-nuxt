# WebGL Hero Architecture

Fullscreen interactive molecule hero built with vanilla TypeScript and Three.js.

## Runtime flow

```
main.ts
  ├─ QualityManager          start HIGH (MEDIUM on coarse/narrow); ?quality= override
  ├─ canvas (#hero-canvas)
  ├─ MoleculeController  → mouse pointermove → absolute tilt + AtomHover NDC
  │                      → touch/pen drag → incremental tilt; tap → pick
  │                      → click → onAtomClick(atomId | null)  [mouse pick]
  │                      → rAF → compose + zoom/fill → labels (dirty) → selection → hover → onAfterUpdate
  │                         → render → PerformanceSampler (lock-once)
  │                         └─ Atom (Group: icosahedron + AtomSelectionIndicator) + AtomLabel / Bond / DecorativeNodes
  ├─ HudFrame / SiteHeader / Navigation / MobileNavOverlay / NavigationConnector
  ├─ PerfOverlay             (dev-only, throttled DOM)
  ├─ NavigationState
  │     atomHover (raycast) · navHover (DOM) · committed (first click)
  ├─ subscribe(state)
  │     highlight + selection indicator + committed wireframe
  │     hover → highlight / pulse only (no focus)
  │     first click → setCommitted + focusAtom + typewriter blurb (troika)
  │     second click same item → Navigator.navigateTo (zoom → fill → overlay)
  ├─ viewport MQ → setCompositionProfile(desktop|tablet|mobile) + connector.enable (desktop)
  │     onAfterUpdate → projectAtom → SVG elbow
  └─ Navigator → overlay veil → DestinationView stub (Return → cancel)
```

- **3D logic** lives under `src/3d/` and does not import DOM navigation or routes.
- **Pure math** (`src/3d/math/`) is side-effect free: `getStableFocusQuaternion` (writes into an `out` quaternion), `getFocusQuaternion`, `getAtomFocusDistance`, orientation, `projectToScreenInto`.
- **UI** (`src/ui/*`) never touches Three.js objects. HUD look: [`DESIGN.md`](DESIGN.md) (CSS `:root` tokens + decorative patterns). Title + typewriter blurb are a scene-parented screen-flat troika block (`AtomLabel`).
- **3D vs screen-space:** Three.js owns the molecule world (atoms, bonds, captions, billboarded selection indicator, wireframe, decorative orbits/nodes) and viewport composition profiles. HTML/CSS/SVG owns grid, corners, header, nav rail, mobile overlay, screen-space SVG connectors, transition veil. Bridge: world position → `projectToScreenInto` / `projectAtom` → CSS pixels. Do not drive atom locals from CSS sidebar width.
- **Page transition / routing seam** lives in `src/navigation/Navigator.ts`. `onNavigate` currently shows a destination stub; swap later for a real router using `NavigationItem.route`.
- **Wiring** lives in `main.ts`.

## Declarative config

### Molecule

Types in [`src/3d/types.ts`](../src/3d/types.ts):

| Type | Fields |
|------|--------|
| `AtomConfig` | `id`, `label` (chemical color key), optional `caption` (section word on the atom), `position`, `radius` |
| `BondConfig` | `id`, `from`, `to` (atom ids) |
| `MoleculeConfig` | `atoms[]`, `bonds[]` |

`MoleculeScene.buildMolecule` iterates config arrays (no hard-coded atom count). Test data: hub `C` at origin + peripherals in [`moleculeConfig.ts`](../src/3d/moleculeConfig.ts) at **equal spherical angles** about the hub (tetrahedron for 4; Fibonacci otherwise) on **individual** orbits with **varied radii** from [`moleculeOrbits.ts`](../src/3d/moleculeOrbits.ts) (`buildSphericalOrbitPlacements` / `ATOM_ORBIT_RADIUS`). IDs and bond graph stay stable.

### Navigation

[`navigationConfig.ts`](../src/navigation/navigationConfig.ts):

| Type | Fields |
|------|--------|
| `NavigationItem` | `id`, `label`, `atomId`, `blurb`, optional `route` |
| `NavigationConfig` | `items: NavigationItem[]` |

Helpers: `getItemById`, `getItemByAtomId`. Each nav item maps to exactly one molecule atom id — keep `items[].atomId` and `atoms[].caption` in sync with `moleculeConfig`.

## Navigation state

[`NavigationState`](../src/navigation/NavigationState.ts) is the **single source of truth** for the active nav item.

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

Two-step gesture (app layer in `main.ts`, not inside Three.js):

1. **Hover** (atom raycast or nav): highlight + pulsing selection reticle. **No** `focusAtom`.
2. **First click** (atom or nav): `setCommitted` + `focusAtom` + freeze reticle + typewriter blurb on the atom.
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

Framing distance: [`getAtomFocusDistance`](../src/3d/math/getAtomFocusDistance.ts) from atom radius + camera FOV (`viewportFill` lerps from base `0.9` toward `1.35` as `fillProgress` → 1). The controller mutates a persistent `focusDistanceOptions` bag each zoom frame (no options-object allocation).

Public scene API (no routes): `focusAtom`, `clearFocus`, `zoomToAtom`, `clearZoom`, `prepareTransitionTarget`, `setZoomProgress`, `setFillProgress`, `setTransitionDriven`, `setHighlightedAtom`, `setHaloAtom`, `setWireframeAtom`, `setCaptionsCompact`, `setCaptionRemainderScale`, `setCompositionProfile`, `setCompositionBias`, `projectAtom`, `onAfterUpdate`.

### Composition profiles

[`composition/profiles.ts`](../src/3d/composition/profiles.ts) defines `desktop` / `tablet` / `mobile` rest framing. `setCompositionProfile` writes `baseMoleculePosition` from viewport fractions `screenX` / `screenY` (camera right / up) plus `approach` (pull toward camera along look). Derived from FOV + aspect + look-at distance — **never** from measuring CSS chrome. Atom locals stay unchanged. Recomputed on resize. Zoom still layers on top of this rest translation.

| Mode | screenX | screenY | approach |
|------|---------|---------|----------|
| desktop | 0.62 | 0.50 | 0 |
| tablet | 0.50 | 0.47 | 0.12 |
| mobile | 0.50 | 0.44 | 0.28 |

**Mobile compact layout** (`MoleculeScene.setCompactLayout`): when mode is `mobile`, hub sphere radius ×0.7 and peripheral positions ×0.7 (bonds + decorative orbits follow). Desktop/tablet keep authored `moleculeConfig` / orbit radii. No other scene properties change.

Committed atom titles use bright ink; idle titles are pure black (`0x000000`) so they do not compete with the focused caption.

### Pointer / touch

- **Mouse (fine):** window `pointermove` absolute tilt around the composition center; canvas `click` raycasts.
- **Touch / pen:** canvas capture; movement &lt; ~10px → tap pick; larger → incremental yaw/pitch drag (clamped to the same `MAX_YAW` / `MAX_PITCH`). Synthetic click after touch is suppressed. Canvas `touch-action: none`.
- Nav / overlay items use [`tapGuard`](../src/ui/tapGuard.ts) so horizontal scroll-drag does not fire selection.

When `setTransitionDriven(true)`, local zoom damping is skipped — `Navigator` owns progress via GSAP.

### Navigation connector bridge

[`NavigationConnector`](../src/ui/NavigationConnector.ts) polls `projectAtom` in `onAfterUpdate`, reads sidebar anchors from `Navigation.getItemAnchor`, and draws an orthogonal SVG elbow. Endpoint tracks projection synchronously (no lag). Tip + tiny marker stop short of the atom. Idle / hover / active / zoom fade; soft distance fade when the span is extreme. Desktop-only (`≥1024`).
## Page transition (`Navigator`)

[`Navigator`](../src/navigation/Navigator.ts) owns a GSAP timeline and [`TransitionState`](../src/navigation/TransitionState.ts). Overlay: [`TransitionOverlay`](../src/ui/TransitionOverlay.ts).

| API | Role |
|-----|------|
| `navigateTo(atomId)` | Interruptible retarget: focus → zoom → fill → overlay; durations scale from live progress |
| `onNavigate(atomId)` | Forward-only cue at the timeline navigate label — replace with router later |
| `cancel()` | Unwind overlay → fill → zoom → clear focus (soft reset; no hard state tear-down) |

Phases: `idle` → `focus` → `zoom` → `fill` → `overlay` → `complete` (stays busy at destination so hover focus cannot fight the pose).

**Current wiring:** first click focuses (`focusAtom`) and types the blurb; second click on the same atom/nav item calls `navigateTo` (zoom starts here). `onNavigate` shows [`DestinationView`](../src/ui/DestinationView.ts) inside the veil; **Return** hides the stub and calls `cancel()`. Empty canvas click clears commit (and `cancel()` if a transition is busy).

## Hover picking, highlight, and selection

[`AtomHover.ts`](../src/3d/AtomHover.ts): raycasts **atom meshes only** (`MoleculeScene.getAtomMeshes()`). Dirty when pointer NDC changes, molecule quaternion / zoom progress changes, or resize. Enter/leave notifies `main.ts` → `NavigationState.setAtomHover`. Selection rings are siblings of the icosahedron on the atom **Group** (not children of the scaled mesh); labels live on `labelsGroup` (scene). Neither is in `atomMeshes` (empty `raycast`). Decorative ghost geometry and the selection wireframe are also not pick targets.

Highlight is separate from focus orientation: `setHighlightedAtom` toggles a light emissive. Selection mode (`idle` / `hover` pulse / `committed` freeze) is set via `setHaloAtom`. The selected wireframe shell follows **committed** only (`setWireframeAtom`); hover must not show it. Nav `.is-active` follows `activeItemId`; `.is-committed` follows `committedItemId`.

## Quality and performance

[`QualityManager`](../src/3d/quality/QualityManager.ts) is the lock-once source of truth (`high` | `medium` | `low`). It does **not** retune on resize, hover, or tab blur.

| Level | maxPixelRatio | atomDetail | wireframe | rings | ticks | decorative | material |
|-------|---------------|------------|-----------|-------|-------|------------|----------|
| HIGH | 1.75 | 1 | yes | 3 | yes | yes | `MeshStandardMaterial` |
| MEDIUM | 1.5 | 1 | yes | 2 | no | no | `MeshStandardMaterial` |
| LOW | 1 | 0 | no | 2 | no | no | `MeshLambertMaterial` |

Pixel ratio is always `Math.min(devicePixelRatio, settings.maxPixelRatio)` — never raw `window.devicePixelRatio`.

Startup: HIGH, or MEDIUM when `pointer: coarse` or width ≤ 767. `?quality=high|medium|low` skips sampling and locks that level.

[`PerformanceSampler`](../src/3d/quality/PerformanceSampler.ts) (after first `render` in `tick`):

1. Skip ~8 warmup frames
2. Record ~45 rAF deltas (already clamped to 50 ms)
3. p95 &lt; 18 ms → HIGH; &lt; 28 ms → MEDIUM; else LOW — **never above** the start heuristic
4. Lock, then watch ~2 s; **one** extra downgrade if still over the current threshold
5. Stop forever

Quality changes call `MoleculeScene.applyQuality` **in place** (swap shared icosahedron geometry, selection ring count, wireframe, decorative visibility, material flavor, pixel ratio). Do **not** `buildMolecule` again — that would drop hover / commit / focus / zoom.

[`GeometryCache`](../src/3d/resources/GeometryCache.ts) owns unit icosahedron (per detail), edges, unit selection circle / ticks / cross. Atoms keep unique matte flat-shaded materials (emissive highlight). Bonds are dashed `Line`s with a shared `LineDashedMaterial` and per-bond geometry. Cache `dispose()` runs on scene teardown; atom `dispose()` must not dispose shared geometry; bond `dispose()` frees its own line geometry.

Renderer stays a plain `WebGLRenderer` (antialias on, no shadows, no EffectComposer / bloom / SSAO / env maps). Antialias is constructor-only; pixel ratio is the resolution lever.

Dev overlay: [`PerfOverlay`](../src/debug/PerfOverlay.ts) — FPS, frame time, quality, pixel ratio. Mounts when `import.meta.env.DEV && DEBUG_PERF`. Flip `DEBUG_PERF` to `false` or `?debug=0` to hide. DOM text updates ~4 Hz, not every frame.

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
| `Atom.ts` / `Bond.ts` / `AtomLabel.ts` / `AtomSelectionIndicator.ts` | Group+flat icosahedron, dashed line connector, two-part caption, billboarded measurement reticle |
| `DecorativeNodes.ts` | HIGH-only unpickable ghost (one hub orbit per atom + wireframe fragments); idle orbits black, active orbit dark gray via `setActiveOrbitAtom`; fades with zoom/fill |
| `moleculeConfig.ts` / `types.ts` | Declarative molecule data (`caption` on atoms) |
| `navigation/navigationConfig.ts` | `NavigationItem[]` + blurbs + id/atom lookups |
| `navigation/NavigationState.ts` | atomHover + navHover + committed; `focusItemId`; subscribe |
| `navigation/Navigator.ts` | GSAP page-transition coordinator; `navigateTo` / `onNavigate` / `cancel` |
| `navigation/TransitionState.ts` | Centralized transition phase / progress snapshot |
| `ui/HudFrame.ts` | Grid + corner ticks (pointer-events none) |
| `ui/SiteHeader.ts` | Desktop logo / SYS / NODE; mobile LOGO + MENU / NAV |
| `ui/MobileNavOverlay.ts` | Editorial full-screen mobile nav index |
| `ui/Navigation.ts` | Bottom bar (≤1023) or left rail (≥1024); `getItemAnchor`; zoom softness |
| `ui/tapGuard.ts` | Tap vs scroll-drag for nav controls |
| `ui/NavigationConnector.ts` | SVG elbow; sync `projectAtom` follow; idle/hover/active/zoom |
| `ui/DestinationView.ts` | Stub section + Return |
| `ui/TransitionOverlay.ts` | Full-viewport veil opacity |
| `debug/PerfOverlay.ts` | Dev-only throttled FPS / quality HUD |
## Scene constraints (current stage)

- Canvas fills the viewport (`100%` / `100dvh`); background `--color-bg` / `0x14161c`.
- Techno HUD overlay (grid, corners, header, nav rail, mobile overlay, SVG connector) — see [`DESIGN.md`](DESIGN.md); no client router — `route` on items is declarative only.
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
| **STATE DRIVEN** | Highlight / selection / wireframe / blurb / nav from `NavigationState` (`main.ts`) |
| **DECORATIVE** | Selection pulse (early-out when idle); ghost layer HIGH-only, fades with zoom/fill |

| Kind | What |
|------|------|
| **Persistent** | Quaternion layers, zoom/fill, base position, hover/label dirty caches, `focusDistanceOptions` |
| **Temporary (scratch)** | Module/instance `Vector3` / `Quaternion` / `Matrix4` reused across focus math, compose, zoom, labels |
| **Render-time** | Compose → zoom translation → **one** matrix update → dirty-gated labels → selection → dirty-gated hover → `onAfterUpdate` → `render()` → sampler |

Frame order after transforms: single forced matrix update, then labels (only when orientation / `zoomProgress` / `fillProgress` changed, or after resize), then selection indicator (pulse needs elapsed time; skip billboard when idle), then hover (no second matrix force). `projectToScreenInto` uses module/instance scratches. Zoom measurement may still force a matrix pass while measuring the atom at rest translation. HUD / nav / overlay stay off the rAF path.

Resize sizing prefers `window.visualViewport` when present, else `innerWidth` / `innerHeight`. Listeners: `resize`, `orientationchange`, and `visualViewport` `resize` / `scroll` (torn down in `stop()`).

## Gotchas

- Bond connectors are dashed `Line`s inset from atom radii; `computeLineDistances()` is required for `LineDashedMaterial`. Not pick targets.
- Atom materials are matte + `flatShading` (HIGH/MEDIUM standard, LOW lambert). Do not reintroduce Fresnel or high metalness — facets must stay readable.
- Peripheral positions and decorative orbits must stay in sync via [`moleculeOrbits.ts`](../src/3d/moleculeOrbits.ts) (`ATOM_ORBIT_PLACEMENT` / `buildSphericalOrbitPlacements`). Each peripheral owns one hub-centered orbit (varied radius); directions use equal spherical spacing (not a shared ecliptic). Do not share one ring across multiple atoms or hard-code XYZ. Active orbit color follows highlight via `setActiveOrbitAtom` (black idle / dark gray active).
- Atom colors are a local `COLOR_BY_LABEL` map in `Atom.ts`, not part of `AtomConfig`.
- `AtomLabel`: parented to `labelsGroup` on the **scene**, not the atom mesh. World position follows the atom; `quaternion.copy(camera.quaternion)` keeps the plane screen-flat (no off-axis foreshortening); scale = distance / 4.5 keeps pixel size stable. First letter centered on the surface point toward the camera; remainder `+X`; blurb under the title. Do not parent labels to the mesh or `lookAt` from a rotated parent.
- `AtomSelectionIndicator`: concentric `LineLoop`s + ticks + center cross parented to the atom **Group**; **screen-flat billboard** via camera quaternion composed against parent world quaternion (not world-tilted); `depthTest` on; not in `atomMeshes`. Quality hides extra rings / ticks; LOW skips the pulse scale wave.
- Atom rest-frame position for focus is `atom.object.position` (the Group), not `mesh.position` (local origin after the unit-icosahedron scale wrap).
- Shared geometries live in `GeometryCache` — do not `geometry.dispose()` on atom/selection teardown. Bond lines own their geometry and dispose it in `Bond.dispose()`. `applyQuality` must not call `buildMolecule`.
- Wireframe shell is decorative and committed-only; quality may disable it. Never add it to `atomMeshes`.
- Keep `navigationConfig.items[].atomId` / labels aligned with `moleculeConfig` atom ids / `caption`.
- Hover may **not** call `focusAtom` — only highlight / selection reticle. Focus comes from `committed` (first click). Zoom starts on the second click via `navigateTo`.
- Do not put route / history / `navigateTo` inside `MoleculeController` click handling — pick notifies; app layer decides.
- Mid-flight `navigateTo` retargets without hard-resetting zoom/fill/overlay; `cancel` builds an unwind timeline from live values (do not `timeline.reverse()` after a retarget that started mid-progress).
- While `Navigator.busy` (including `complete`), `main.ts` skips hover-driven focus updates.
- Focus uses **rest-frame** atom position (ignore current group rotation) so the focus quaternion stays absolute and independent of the mouse layer.
- `setCompositionProfile` must use FOV/aspect only — never `getBoundingClientRect` on the sidebar. Atom locals stay fixed. Prefer profiles over ad-hoc `setCompositionBias`.
- `NavigationConnector` consumes screen pixels only (`projectAtom` + DOM anchors). Do not import scene graph objects into UI modules. Tip + tiny marker stop short of the atom.
- Desktop rail / header / connector are CSS ≥1024; tablet keeps bottom nav; mobile uses header + compact rail + MENU overlay and hides the connector.
- `clearFocus` only lowers `focusStrength`; do not slerp focus orientation to identity on leave (avoids a long unused arc).
- Central / Home atom (zero offset): no unique focus forward — on enter, apply a π flip about a random axis from the current focus pose (idempotent while already focused on hub). Peripheral focus still uses `getStableFocusQuaternion`. `focusAtom` also clears residual pointer/touch tilt so the atom faces the camera.
- Do not write `moleculeGroup.rotation.x/y += …`; apply composed absolute layers each frame (no rotation accumulation).
- Do not `new Vector3` / `new Quaternion` / options literals inside `tick` / `update` — use scratches and persistent options bags.
- Hover stays dirty every frame while orientation/zoom is still damping (correct under a still pointer); idle settled frames do not raycast.
- Dispose path: HMR disposes navigator, destination, hud, nav, controller; `Navigator.dispose()` kills the timeline and removes the overlay; `MoleculeScene.dispose` clears meshes, `renderer.dispose()`, then `forceContextLoss()`. Production page has no unmount dispose beyond HMR — acceptable for this Vite prototype.
- Graphite colors in `COLOR_BY_LABEL` must stay darker than caption ink (see [`DESIGN.md`](DESIGN.md) scene tokens).
