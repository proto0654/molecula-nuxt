# WebGL Hero Architecture

Fullscreen interactive molecule hero built with vanilla TypeScript and Three.js.

## Runtime flow

```
main.ts
  ├─ canvas (#hero-canvas)
  ├─ MoleculeController  → pointermove → updateMouseInfluence + AtomHover NDC
  │                      → click → onAtomClick(atomId | null)  [pick only]
  │                      → rAF → compose + zoom/fill → labels (dirty) → halo (every frame) → hover → onAfterUpdate
  │                         └─ Atom (sphere + AtomLabel caption + AtomHalo) / Bond
  ├─ HudFrame / Navigation   (DOM overlay, no Three.js)
  ├─ NavigationState
  │     atomHover (raycast) · navHover (DOM) · committed (first click)
  ├─ subscribe(state)
  │     highlight + halo
  │     hover → highlight / pulse only (no focus)
  │     first click → setCommitted + focusAtom + typewriter blurb (troika)
  │     second click same item → Navigator.navigateTo (zoom → fill → overlay)
  └─ Navigator → overlay veil → DestinationView stub (Return → cancel)
```

- **3D logic** lives under `src/3d/` and does not import DOM navigation or routes.
- **Pure math** (`src/3d/math/`) is side-effect free: `getStableFocusQuaternion` (writes into an `out` quaternion), `getFocusQuaternion`, `getAtomFocusDistance`, orientation, `projectToScreenInto`.
- **UI** (`src/ui/*`) never touches Three.js. HUD look: [`DESIGN.md`](DESIGN.md) (CSS `:root` tokens + decorative patterns). Title + typewriter blurb are a scene-parented screen-flat troika block (`AtomLabel`).
- **Page transition / routing seam** lives in `src/navigation/Navigator.ts`. `onNavigate` currently shows a destination stub; swap later for a real router using `NavigationItem.route`.
- **Wiring** lives in `main.ts`.

## Declarative config

### Molecule

Types in [`src/3d/types.ts`](../src/3d/types.ts):

| Type | Fields |
|------|--------|
| `AtomConfig` | `id`, `label` (chemical color key), optional `caption` (section word on the sphere), `position`, `radius` |
| `BondConfig` | `id`, `from`, `to` (atom ids) |
| `MoleculeConfig` | `atoms[]`, `bonds[]` |

`MoleculeScene.buildMolecule` iterates config arrays (no hard-coded atom count). Test data: methane-like tetrahedral layout in [`moleculeConfig.ts`](../src/3d/moleculeConfig.ts) (5 atoms, 4 bonds).

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
| `committedItemId` | first click (`selectItem`) | Sticky zoom + frozen halo + typewriter readout |

Two-step gesture (app layer in `main.ts`, not inside Three.js):

1. **Hover** (atom raycast or nav): highlight + pulsing halo. **No** `focusAtom`.
2. **First click** (atom or nav): `setCommitted` + `focusAtom` + freeze halo + typewriter blurb on the atom.
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

1. `pointermove` → normalize client coords to `[-1, 1]` (center = `0,0`).
2. `updateMouseInfluence(pointer)` → yaw about +Y and pitch about +X via `setFromAxisAngle`, then `targetMouse = qYaw × qPitch` (no Euler).
3. Each frame: slerp mouse toward target (`MOUSE_FOLLOW`).

Screen center restores mouse identity. Max angles capped (`MAX_YAW` / `MAX_PITCH`). Scratch quaternions / vectors reused (no per-frame allocations for those paths).

### Focus layer

1. `focusAtom(atomId)` → rest-frame atom position (`local + moleculeWorld`) + camera world position.
2. `getStableFocusQuaternion(..., out = targetFocusOrientation)` (reference = current `focusOrientation`); set `targetFocusStrength = 1`.
3. `clearFocus()` → `targetFocusStrength = 0` only (keeps last focus pose; influence fades via strength).
4. Each frame: slerp focus orientation (`FOCUS_ORIENT_FOLLOW`), damp `focusStrength`, build `appliedFocus`, compose with mouse and base, apply to `moleculeGroup`.

Focus follows **click commit** only. Hover never calls `focusAtom`. Mouse keeps applying under focus.

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

Public scene API (no routes): `focusAtom`, `clearFocus`, `zoomToAtom`, `clearZoom`, `prepareTransitionTarget`, `setZoomProgress`, `setFillProgress`, `setTransitionDriven`, `setHighlightedAtom`, `setHaloAtom`, `setCaptionsCompact`, `setCaptionRemainderScale`, `projectAtom`, `onAfterUpdate`.

When `setTransitionDriven(true)`, local zoom damping is skipped — `Navigator` owns progress via GSAP.

## Page transition (`Navigator`)

[`Navigator`](../src/navigation/Navigator.ts) owns a GSAP timeline and [`TransitionState`](../src/navigation/TransitionState.ts). Overlay: [`TransitionOverlay`](../src/ui/TransitionOverlay.ts).

| API | Role |
|-----|------|
| `navigateTo(atomId)` | Interruptible retarget: focus → zoom → fill → overlay; durations scale from live progress |
| `onNavigate(atomId)` | Forward-only cue at the timeline navigate label — replace with router later |
| `cancel()` | Unwind overlay → fill → zoom → clear focus (soft reset; no hard state tear-down) |

Phases: `idle` → `focus` → `zoom` → `fill` → `overlay` → `complete` (stays busy at destination so hover focus cannot fight the pose).

**Current wiring:** first click focuses (`focusAtom`) and types the blurb; second click on the same atom/nav item calls `navigateTo` (zoom starts here). `onNavigate` shows [`DestinationView`](../src/ui/DestinationView.ts) inside the veil; **Return** hides the stub and calls `cancel()`. Empty canvas click clears commit (and `cancel()` if a transition is busy).

## Hover picking, highlight, and halo

[`AtomHover.ts`](../src/3d/AtomHover.ts): raycasts **atom meshes only** (`MoleculeScene.getAtomMeshes()`). Dirty when pointer NDC changes, molecule quaternion / zoom progress changes, or resize. Enter/leave notifies `main.ts` → `NavigationState.setAtomHover`. Halo rings are children of the atom mesh; labels live on `labelsGroup` (scene). Neither is in `atomMeshes` (empty `raycast`).

Highlight is separate from focus orientation: `setHighlightedAtom` toggles a light emissive. Halo mode (`idle` / `hover` pulse / `committed` freeze) is set via `setHaloAtom`. Nav `.is-active` follows `activeItemId`; `.is-committed` follows `committedItemId`.

## Key modules

| File | Role |
|------|------|
| `MoleculeScene.ts` | Scene, camera, renderer, lights, `buildMolecule`, dirty-gated labels, every-frame halo tick |
| `MoleculeController.ts` | rAF, pointer / viewport resize, orientation layers, zoom/fill, pick, `projectAtom`, halo/caption APIs |
| `AtomHover.ts` | NDC raycast pick; enter/leave listeners |
| `math/focusAtom.ts` | `getStableFocusQuaternion`, `getFocusQuaternion`, camera-framing helper |
| `math/getAtomFocusDistance.ts` | FOV-based distance so a sphere covers a viewport fraction |
| `math/projection.ts` | `projectToScreenInto` (scratch) / `projectToScreen` |
| `Atom.ts` / `Bond.ts` / `AtomLabel.ts` / `AtomHalo.ts` | Sphere, cylinder, two-part caption, concentric rings |
| `moleculeConfig.ts` / `types.ts` | Declarative molecule data (`caption` on atoms) |
| `navigation/navigationConfig.ts` | `NavigationItem[]` + blurbs + id/atom lookups |
| `navigation/NavigationState.ts` | atomHover + navHover + committed; `focusItemId`; subscribe |
| `navigation/Navigator.ts` | GSAP page-transition coordinator; `navigateTo` / `onNavigate` / `cancel` |
| `navigation/TransitionState.ts` | Centralized transition phase / progress snapshot |
| `ui/HudFrame.ts` | Grid + corner ticks (pointer-events none) |
| `ui/Navigation.ts` | Techno nav overlay; hover → `setNavHover`; click → app `onSelect` |
| `ui/DestinationView.ts` | Stub section + Return |
| `ui/TransitionOverlay.ts` | Full-viewport veil opacity |

## Scene constraints (current stage)

- Canvas fills the viewport (`100%` / `100dvh`); background `--color-bg` / `0x0f1115`.
- Techno HUD overlay (grid, corners, nav) — see [`DESIGN.md`](DESIGN.md); no client router — `route` on items is declarative only.
- Responsive: desktop ≥1024 (full captions), tablet 768–1023 (tighter nav, smaller remainder), mobile ≤767 (first-letter captions).
- No postprocessing, bloom, particle systems, or physics.
- Pixel ratio capped at `2`, refreshed on every resize (monitor / OS DPR changes).
- GSAP drives the page-transition timeline; idle spin is unused.

## Render-loop hygiene

Separate concerns so nothing hidden reallocates every frame:

| Kind | What |
|------|------|
| **Persistent** | Quaternion layers, zoom/fill, base position, hover/label dirty caches, `focusDistanceOptions` |
| **Temporary (scratch)** | Module/instance `Vector3` / `Quaternion` / `Matrix4` reused across focus math, compose, zoom, labels |
| **Render-time** | Compose → zoom translation → **one** `moleculeGroup.updateMatrixWorld(true)` → dirty-gated labels → every-frame halo → dirty-gated hover → `onAfterUpdate` → `render()` |

Frame order after transforms: single forced matrix update, then labels (only when orientation / `zoomProgress` / `fillProgress` changed, or after resize), then halo (always — pulse needs elapsed time), then hover (no second matrix force). `projectToScreenInto` uses module/instance scratches. Zoom measurement may still force a matrix pass while measuring the atom at rest translation.

Resize sizing prefers `window.visualViewport` when present, else `innerWidth` / `innerHeight`. Listeners: `resize`, `orientationchange`, and `visualViewport` `resize` / `scroll` (torn down in `stop()`).

## Gotchas

- Bond orientation assumes Three.js cylinder axis is +Y; near-zero length bonds skip `setFromUnitVectors`.
- Atom colors are a local `COLOR_BY_LABEL` map in `Atom.ts`, not part of `AtomConfig`.
- `AtomLabel`: parented to `labelsGroup` on the **scene**, not the atom mesh. World position follows the atom; `quaternion.copy(camera.quaternion)` keeps the plane screen-flat (no off-axis foreshortening); scale = distance / 4.5 keeps pixel size stable. First letter centered on the surface point toward the camera; remainder `+X`; blurb under the title. Do not parent labels to the mesh or `lookAt` from a rotated parent.
- `AtomHalo`: concentric `LineLoop`s parented to the atom; billboarded every frame; not in `atomMeshes`.
- Keep `navigationConfig.items[].atomId` / labels aligned with `moleculeConfig` atom ids / `caption`.
- Hover may **not** call `focusAtom` — only highlight / halo. Focus comes from `committed` (first click). Zoom starts on the second click via `navigateTo`.
- Do not put route / history / `navigateTo` inside `MoleculeController` click handling — pick notifies; app layer decides.
- Mid-flight `navigateTo` retargets without hard-resetting zoom/fill/overlay; `cancel` builds an unwind timeline from live values (do not `timeline.reverse()` after a retarget that started mid-progress).
- While `Navigator.busy` (including `complete`), `main.ts` skips hover-driven focus updates.
- Focus uses **rest-frame** atom position (ignore current group rotation) so the focus quaternion stays absolute and independent of the mouse layer.
- `clearFocus` only lowers `focusStrength`; do not slerp focus orientation to identity on leave (avoids a long unused arc).
- Central atom (zero offset from molecule origin) has no unique focus forward; stable math keeps the reference quaternion.
- Do not write `moleculeGroup.rotation.x/y += …`; apply composed absolute layers each frame (no rotation accumulation).
- Do not `new Vector3` / `new Quaternion` / options literals inside `tick` / `update` — use scratches and persistent options bags.
- Hover stays dirty every frame while orientation/zoom is still damping (correct under a still pointer); idle settled frames do not raycast.
- Dispose path: HMR disposes navigator, destination, hud, nav, controller; `Navigator.dispose()` kills the timeline and removes the overlay; `MoleculeScene.dispose` clears meshes, `renderer.dispose()`, then `forceContextLoss()`. Production page has no unmount dispose beyond HMR — acceptable for this Vite prototype.
- Sphere colors in `COLOR_BY_LABEL` must stay darker than caption ink (see [`DESIGN.md`](DESIGN.md) scene tokens).
