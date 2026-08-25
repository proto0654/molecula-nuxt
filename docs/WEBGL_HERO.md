# WebGL Hero Architecture

Fullscreen interactive molecule hero built with vanilla TypeScript and Three.js.

## Runtime flow

```
main.ts
  ├─ canvas (#hero-canvas)
  ├─ MoleculeController  → pointermove → updateMouseInfluence
  │                      → rAF → update(delta) → MoleculeScene.render
  │                         └─ buildMolecule(moleculeConfig)
  │                              Atom (Sphere) / Bond (Cylinder)
  └─ Navigation (DOM)    → NavigationState / navigationConfig
```

- **3D logic** lives under `src/3d/` and does not depend on DOM navigation.
- **Pure math** (`src/3d/math/`) is side-effect free for unit testing: `focusAtom`, `orientationFromDirection`, `projectToScreen`.
- **UI** (`src/ui/Navigation.ts`) only drives `NavigationState` (active atom index). Camera focus is not wired yet.

## Declarative config

Types in [`src/3d/types.ts`](../src/3d/types.ts):

| Type | Fields |
|------|--------|
| `AtomConfig` | `id`, `label`, `position: [x,y,z]`, `radius` |
| `BondConfig` | `id`, `from`, `to` (atom ids) |
| `MoleculeConfig` | `atoms[]`, `bonds[]` |

`MoleculeScene.buildMolecule` iterates config arrays (no hard-coded atom count). Test data: methane-like tetrahedral layout in [`moleculeConfig.ts`](../src/3d/moleculeConfig.ts) (5 atoms, 4 bonds). `navigationConfig.atomOrder` must stay in sync with atom ids.

## Orientation (mouse influence)

Pointer drives molecule orientation via **quaternions**, not accumulated `rotation.x/y`.

| State | Location | Role |
|-------|----------|------|
| `mouseQuaternion` | `MoleculeController` | Current smoothed mouse influence; copied to `moleculeGroup.quaternion` each frame |
| `targetMouseQuaternion` | `MoleculeController` | Target from latest normalized pointer |

Flow:

1. `pointermove` → normalize client coords to `[-1, 1]` (center = `0,0`).
2. `updateMouseInfluence(pointer)` → limited yaw/pitch Euler (`YXZ`) → `targetMouseQuaternion`.
3. `update(delta)` → frame-rate independent slerp (`1 - exp(-k·Δt)`) toward target → apply to group.

Screen center restores base orientation (identity). Max angles are capped (`MAX_YAW` / `MAX_PITCH`); not a full turn. Scratch `Euler` / pointer object are reused (no per-frame allocations).

**Architecture:** only the mouse layer exists today. A future `focusAtom` quaternion must compose separately — do not fold both into one shared “rotation” state.

## Key modules

| File | Role |
|------|------|
| `MoleculeScene.ts` | Scene, PerspectiveCamera, WebGLRenderer, lights, resize, `buildMolecule`, render |
| `MoleculeController.ts` | rAF loop, resize + pointer listeners, `updateMouseInfluence` / `update(delta)`, applies `mouseQuaternion` |
| `Atom.ts` | `SphereGeometry` mesh; `mesh.userData.atomId`; color from `label` lookup (not in config) |
| `Bond.ts` | `CylinderGeometry` mesh; mid-point position; `quaternion.setFromUnitVectors` along bond axis |
| `AtomLabel.ts` | troika `Text` wrapper (present, not attached this stage) |
| `moleculeConfig.ts` | Static `MoleculeConfig` test molecule |
| `types.ts` | `AtomConfig`, `BondConfig`, `MoleculeConfig` |

## Scene constraints (current stage)

- Canvas fills the viewport; background `#0f1115`.
- No postprocessing, bloom, particle systems, or physics.
- No hover picking; no atom labels in the scene.
- Pixel ratio capped at `2`.
- GSAP remains a dependency for upcoming camera focus; idle spin is no longer used.

## Gotchas

- Bond orientation assumes Three.js cylinder axis is +Y; near-zero length bonds skip `setFromUnitVectors`.
- Atom colors are a local `COLOR_BY_LABEL` map in `Atom.ts`, not part of `AtomConfig`.
- `AtomLabel` / troika remain in the repo for a later stage; ambient types live in [`src/vite-env.d.ts`](../src/vite-env.d.ts).
- Navigation Prev/Next updates state/label only; it does not yet call `focusAtom` or move the camera.
- Do not write `moleculeGroup.rotation.x/y += …` each frame; orientation is absolute from pointer via quaternion slerp.
- Dispose path: HMR and `MoleculeController.dispose()` remove listeners and dispose atom/bond geometries and materials.
