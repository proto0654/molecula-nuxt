# Context

Interactive WebGL hero prototype for a molecule visualization block.

## Stack

- Vite + TypeScript (no React / Vue / R3F)
- Three.js
- GSAP
- troika-three-text (available; labels not mounted in the scene yet)

## Entry points

- App bootstrap: [`src/main.ts`](src/main.ts)
- Scene / render loop: [`src/3d/MoleculeController.ts`](src/3d/MoleculeController.ts), [`src/3d/MoleculeScene.ts`](src/3d/MoleculeScene.ts)
- Molecule data: [`src/3d/moleculeConfig.ts`](src/3d/moleculeConfig.ts) (`MoleculeConfig`)
- Navigation UI: [`src/ui/Navigation.ts`](src/ui/Navigation.ts) → [`src/navigation/NavigationState.ts`](src/navigation/NavigationState.ts)

## Current focus

Config-driven molecule mesh: `Atom` (`SphereGeometry`) + `Bond` (`CylinderGeometry`) built from `MoleculeConfig` (5-atom methane-like test layout). Fullscreen camera/renderer/resize/rAF; pointer drives molecule orientation via `mouseQuaternion` / `targetMouseQuaternion` (slerp). No hover, no scene labels, no physics.

## Docs hub

See [`docs/README.md`](docs/README.md).
