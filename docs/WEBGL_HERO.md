# WebGL Hero Architecture

Fullscreen interactive molecule hero built with vanilla TypeScript and Three.js.

## Runtime flow

```
main.ts
  ├─ canvas (#hero-canvas)
  ├─ MoleculeController  → pointermove → updateMouseInfluence + AtomHover NDC
  │                      → rAF → update(delta) → compose quaternions → render
  │                         └─ buildMolecule(moleculeConfig)
  │                              Atom (Sphere) / Bond (Cylinder)
  │                      → clearFocus / setHighlightedAtom / focusAtom
  ├─ NavigationState     ← single source of truth (activeItemId)
  │     ↑ setNavHover          ↑ setAtomHover
  │     Navigation (DOM)       controller.onAtomHover
  └─ subscribe(state)    → focusAtom | clearFocus + setHighlightedAtom
                         → Navigation toggles .is-active
```

- **3D logic** lives under `src/3d/` and does not import DOM navigation.
- **Pure math** (`src/3d/math/`) is side-effect free: `getStableFocusQuaternion`, `getFocusQuaternion`, `focusAtom` (camera framing helper), `orientationFromDirection`, `projectToScreen`.
- **UI** (`src/ui/Navigation.ts`) only calls `NavigationState` (`setNavHover`). It never touches Three.js.
- **Wiring** lives in `main.ts`: state subscribe → controller; atom hover → `setAtomHover`.

## Declarative config

### Molecule

Types in [`src/3d/types.ts`](../src/3d/types.ts):

| Type | Fields |
|------|--------|
| `AtomConfig` | `id`, `label`, `position: [x,y,z]`, `radius` |
| `BondConfig` | `id`, `from`, `to` (atom ids) |
| `MoleculeConfig` | `atoms[]`, `bonds[]` |

`MoleculeScene.buildMolecule` iterates config arrays (no hard-coded atom count). Test data: methane-like tetrahedral layout in [`moleculeConfig.ts`](../src/3d/moleculeConfig.ts) (5 atoms, 4 bonds).

### Navigation

[`navigationConfig.ts`](../src/navigation/navigationConfig.ts):

| Type | Fields |
|------|--------|
| `NavigationItem` | `id`, `label`, `atomId`, optional `route` |
| `NavigationConfig` | `items: NavigationItem[]` |

Helpers: `getItemById`, `getItemByAtomId`. Each nav item maps to exactly one molecule atom id — keep `items[].atomId` in sync with `moleculeConfig.atoms[].id`.

## Navigation state

[`NavigationState`](../src/navigation/NavigationState.ts) is the **single source of truth** for the active nav item.

Effective selection:

```
activeItemId = navHover ?? atomHover ?? committed
```

| Source | Writer | Role |
|--------|--------|------|
| `navHoverItemId` | `setNavHover` (DOM overlay) | Hover over a nav item |
| `atomHoverItemId` | `setAtomHover` (from raycast atom id) | Hover over an atom mesh |
| `committedItemId` | `setCommitted` | Optional sticky selection; leave hover restores this (currently unused → base/`null`) |

Dual hover sources matter: window `pointermove` still raycasts while the pointer is over the HTML overlay; atom-hover `null` must not clear an active nav hover.

DOM: item `pointerenter` → `setNavHover(id)`; **nav root** `pointerleave` → `setNavHover(null)` (not per-item leave, to avoid sibling flicker). Subscribe listeners receive `(activeItemId, item | null)`.

## Orientation (two quaternion layers)

Molecule orientation is the product of two independent layers — **do not fold them into one shared rotation state**:

```
final = focusQuaternion × mouseQuaternion
```

| State | Location | Role |
|-------|----------|------|
| `focusQuaternion` | `MoleculeController` | Smoothed focus layer (atom toward camera) |
| `targetFocusQuaternion` | `MoleculeController` | Target from latest `focusAtom(atomId)` or `clearFocus()` (identity) |
| `focusStrength` | `MoleculeController` | Focus slerp rate (`1 - exp(-k·Δt)`) |
| `mouseQuaternion` | `MoleculeController` | Smoothed limited yaw/pitch from pointer |
| `targetMouseQuaternion` | `MoleculeController` | Target from latest normalized pointer |

### Mouse layer

1. `pointermove` → normalize client coords to `[-1, 1]` (center = `0,0`).
2. `updateMouseInfluence(pointer)` → limited yaw/pitch Euler (`YXZ`) → `targetMouseQuaternion`.
3. Each frame: slerp mouse toward target (`MOUSE_FOLLOW`).

Screen center restores mouse identity. Max angles capped (`MAX_YAW` / `MAX_PITCH`). Scratch Euler / vectors reused (no per-frame allocations for those paths).

### Focus layer

1. `focusAtom(atomId)` → rest-frame atom position (`local + moleculeWorld`) + camera world position.
2. `getStableFocusQuaternion(...)` → `targetFocusQuaternion` (reference = current `focusQuaternion`).
3. `clearFocus()` → `targetFocusQuaternion.identity()` (base orientation).
4. Each frame: slerp focus toward target (`focusStrength`), then compose with mouse and apply to `moleculeGroup`.

**Stable focus math** (`getStableFocusQuaternion`): builds RH orthonormal bases with `+Z = forward` (FROM: atomDir in rest space; TO: cameraDir in world). World up-hint is `referenceQuaternion * localUp`, so twist about the view axis stays close to the current focus orientation. `R = M_to · M_from⁻¹`. No Euler. Degenerate cases (zero atom/camera dir, `up ∥ forward`) fall back to reference clone or an alternate axis.

`getFocusQuaternion` remains as the unconstrained `setFromUnitVectors` baseline; production path uses the stable variant.

## Hover picking and highlight

[`AtomHover.ts`](../src/3d/AtomHover.ts): raycasts **atom meshes only** (`MoleculeScene.getAtomMeshes()`). Dirty when pointer NDC changes, molecule quaternion changes, or resize. Enter/leave notifies `main.ts` → `NavigationState.setAtomHover`.

Highlight is separate from focus orientation: `MoleculeController.setHighlightedAtom(atomId | null)` toggles a light emissive on [`Atom.setHighlighted`](../src/3d/Atom.ts). Nav item `.is-active` and atom emissive both follow `NavigationState.activeItemId`.

## Key modules

| File | Role |
|------|------|
| `MoleculeScene.ts` | Scene, camera, renderer, lights, `buildMolecule`, `getAtom` / `getAtoms` / `getAtomMeshes`, per-frame label updates |
| `MoleculeController.ts` | rAF, pointer, mouse + focus layers, `focusAtom`, `clearFocus`, `setHighlightedAtom`, hover wiring |
| `AtomHover.ts` | NDC raycast pick; enter/leave listeners |
| `math/focusAtom.ts` | `getStableFocusQuaternion`, `getFocusQuaternion`, camera-framing `focusAtom` |
| `Atom.ts` | `SphereGeometry` mesh; owns `AtomLabel` child; `mesh.userData.atomId`; color from `label` lookup; emissive highlight |
| `Bond.ts` | `CylinderGeometry`; mid-point; `setFromUnitVectors` along bond axis |
| `AtomLabel.ts` | troika `Text` on sphere surface toward camera; `update(camera)` each frame |
| `moleculeConfig.ts` | Static `MoleculeConfig` test molecule |
| `types.ts` | `AtomConfig`, `BondConfig`, `MoleculeConfig` |
| `navigation/navigationConfig.ts` | `NavigationItem[]` + id/atom lookups |
| `navigation/NavigationState.ts` | Dual-hover + committed active item; subscribe |
| `ui/Navigation.ts` | HTML nav overlay; DOM → state only |

## Scene constraints (current stage)

- Canvas fills the viewport; background `#0f1115`.
- Minimal HTML nav overlay (bottom); no router — `route` on items is declarative only.
- No postprocessing, bloom, particle systems, or physics.
- Atom hover picking + nav hover share `NavigationState`; 3D atom labels (troika) are children of each atom mesh.
- Pixel ratio capped at `2`.
- GSAP remains a dependency for upcoming camera motion; idle spin is unused.

## Gotchas

- Bond orientation assumes Three.js cylinder axis is +Y; near-zero length bonds skip `setFromUnitVectors`.
- Atom colors are a local `COLOR_BY_LABEL` map in `Atom.ts`, not part of `AtomConfig`.
- `AtomLabel`: child of `atom.mesh` (atom parent stays `moleculeGroup`). Each frame after `updateMatrixWorld`: `normal = normalize(cameraWorld − atomWorld)`, position at `atomWorld + normal * radius`, then `lookAt(camera)` for a tangent billboard. No HTML / CSS2D. `sync()` once at construction; ambient types in [`src/vite-env.d.ts`](../src/vite-env.d.ts).
- Keep `navigationConfig.items[].atomId` aligned with `moleculeConfig` atom ids.
- Dual hover is required: clearing atom hover while the pointer is over the HTML nav must not wipe `navHover`.
- Focus uses **rest-frame** atom position (ignore current group rotation) so the focus quaternion stays absolute and independent of the mouse layer.
- Central atom (zero offset from molecule origin) has no unique focus forward; stable math keeps the reference quaternion.
- Do not write `moleculeGroup.rotation.x/y += …`; apply composed quaternions each frame.
- Dispose path: HMR and `MoleculeController.dispose()` remove listeners and dispose atom/bond/label geometries and materials; `main.ts` also unsubscribes nav/hover and `navigation.dispose()`.
- `MoleculeScene.update` refreshes `moleculeGroup` world matrices then calls `atom.updateLabel(camera)` so labels stay correct under molecule rotation.
