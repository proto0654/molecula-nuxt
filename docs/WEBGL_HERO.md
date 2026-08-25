# WebGL Hero Architecture

Fullscreen interactive molecule hero built with vanilla TypeScript and Three.js.

## Runtime flow

```
main.ts
  ├─ canvas (#hero-canvas)
  ├─ MoleculeController  → MoleculeScene (Scene / Camera / Renderer / loop)
  │                         └─ buildMolecule(moleculeConfig)
  │                              Atom / Bond / AtomLabel
  └─ Navigation (DOM)    → NavigationState / navigationConfig
```

- **3D logic** lives under `src/3d/` and does not depend on DOM navigation.
- **Pure math** (`src/3d/math/`) is side-effect free for unit testing: `focusAtom`, `orientationFromDirection`, `projectToScreen`.
- **UI** (`src/ui/Navigation.ts`) only drives `NavigationState` (active atom index). Camera focus is not wired yet.

## Key modules

| File | Role |
|------|------|
| `MoleculeScene.ts` | Scene, PerspectiveCamera, WebGLRenderer, lights, resize, `buildMolecule`, render |
| `MoleculeController.ts` | rAF loop, resize listener, GSAP idle Y-rotation of `moleculeGroup` |
| `Atom.ts` / `Bond.ts` / `AtomLabel.ts` | Mesh / Line / troika `Text` wrappers with `dispose()` |
| `moleculeConfig.ts` | Static H₂O-like layout (3 atoms, 2 bonds) |
| `types.ts` | `AtomData`, `BondData`, `MoleculeData` |

## Scene constraints (current stage)

- Canvas fills the viewport; background `#0f1115`.
- No postprocessing, bloom, or particle systems.
- Labels are troika text meshes parented to the molecule group (rotate with the molecule).
- Pixel ratio capped at `2`.

## Gotchas

- `troika-three-text` has a local ambient module declaration in [`src/vite-env.d.ts`](../src/vite-env.d.ts).
- Navigation Prev/Next updates state/label only; it does not yet call `focusAtom` or move the camera.
- Dispose path: HMR and `MoleculeController.dispose()` kill GSAP tweens and dispose geometries/materials/labels.
