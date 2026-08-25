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
  │                      → focusAtom(atomId) → targetFocusQuaternion (not nav-wired yet)
  └─ Navigation (DOM)    → NavigationState / navigationConfig
```

- **3D logic** lives under `src/3d/` and does not depend on DOM navigation.
- **Pure math** (`src/3d/math/`) is side-effect free: `getStableFocusQuaternion`, `getFocusQuaternion`, `focusAtom` (camera framing helper), `orientationFromDirection`, `projectToScreen`.
- **UI** (`src/ui/Navigation.ts`) only drives `NavigationState` (active atom index). It does not yet call `MoleculeController.focusAtom`.

## Declarative config

Types in [`src/3d/types.ts`](../src/3d/types.ts):

| Type | Fields |
|------|--------|
| `AtomConfig` | `id`, `label`, `position: [x,y,z]`, `radius` |
| `BondConfig` | `id`, `from`, `to` (atom ids) |
| `MoleculeConfig` | `atoms[]`, `bonds[]` |

`MoleculeScene.buildMolecule` iterates config arrays (no hard-coded atom count). Test data: methane-like tetrahedral layout in [`moleculeConfig.ts`](../src/3d/moleculeConfig.ts) (5 atoms, 4 bonds). `navigationConfig.atomOrder` must stay in sync with atom ids.

## Orientation (two quaternion layers)

Molecule orientation is the product of two independent layers — **do not fold them into one shared rotation state**:

```
final = focusQuaternion × mouseQuaternion
```

| State | Location | Role |
|-------|----------|------|
| `focusQuaternion` | `MoleculeController` | Smoothed focus layer (atom toward camera) |
| `targetFocusQuaternion` | `MoleculeController` | Target from latest `focusAtom(atomId)` |
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
3. Each frame: slerp focus toward target (`focusStrength`), then compose with mouse and apply to `moleculeGroup`.

**Stable focus math** (`getStableFocusQuaternion`): builds RH orthonormal bases with `+Z = forward` (FROM: atomDir in rest space; TO: cameraDir in world). World up-hint is `referenceQuaternion * localUp`, so twist about the view axis stays close to the current focus orientation. `R = M_to · M_from⁻¹`. No Euler. Degenerate cases (zero atom/camera dir, `up ∥ forward`) fall back to reference clone or an alternate axis.

`getFocusQuaternion` remains as the unconstrained `setFromUnitVectors` baseline; production path uses the stable variant.

## Hover picking

[`AtomHover.ts`](../src/3d/AtomHover.ts): raycasts **atom meshes only** (`MoleculeScene.getAtomMeshes()`). Dirty when pointer NDC changes, molecule quaternion changes, or resize. `main.ts` shows a temporary hover debug overlay; hover does not yet call `focusAtom`.

## Key modules

| File | Role |
|------|------|
| `MoleculeScene.ts` | Scene, camera, renderer, lights, `buildMolecule`, `getAtom` / `getAtomMeshes` |
| `MoleculeController.ts` | rAF, pointer, mouse + focus layers, `focusAtom`, hover wiring |
| `AtomHover.ts` | NDC raycast pick; enter/leave listeners |
| `math/focusAtom.ts` | `getStableFocusQuaternion`, `getFocusQuaternion`, camera-framing `focusAtom` |
| `Atom.ts` | `SphereGeometry` mesh; `mesh.userData.atomId`; color from `label` lookup |
| `Bond.ts` | `CylinderGeometry`; mid-point; `setFromUnitVectors` along bond axis |
| `AtomLabel.ts` | troika `Text` wrapper (present, not attached this stage) |
| `moleculeConfig.ts` | Static `MoleculeConfig` test molecule |
| `types.ts` | `AtomConfig`, `BondConfig`, `MoleculeConfig` |

## Scene constraints (current stage)

- Canvas fills the viewport; background `#0f1115`.
- No postprocessing, bloom, particle systems, or physics.
- Atom hover picking exists; atom labels are not in the scene.
- Pixel ratio capped at `2`.
- GSAP remains a dependency for upcoming camera motion; idle spin is unused.

## Gotchas

- Bond orientation assumes Three.js cylinder axis is +Y; near-zero length bonds skip `setFromUnitVectors`.
- Atom colors are a local `COLOR_BY_LABEL` map in `Atom.ts`, not part of `AtomConfig`.
- `AtomLabel` / troika remain for a later stage; ambient types in [`src/vite-env.d.ts`](../src/vite-env.d.ts).
- Navigation Prev/Next updates state/label only — does **not** call `MoleculeController.focusAtom` yet.
- Focus uses **rest-frame** atom position (ignore current group rotation) so the focus quaternion stays absolute and independent of the mouse layer.
- Central atom (zero offset from molecule origin) has no unique focus forward; stable math keeps the reference quaternion.
- Do not write `moleculeGroup.rotation.x/y += …`; apply composed quaternions each frame.
- Dispose path: HMR and `MoleculeController.dispose()` remove listeners and dispose atom/bond geometries and materials.
