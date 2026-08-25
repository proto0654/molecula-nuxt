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

Config-driven molecule (`Atom` / `Bond` from `MoleculeConfig`). Dual orientation layers on `moleculeGroup`: `focusQuaternion × mouseQuaternion` (stable focus via `getStableFocusQuaternion`; mouse yaw/pitch slerp). Atom hover picking (`AtomHover`) is live; navigation is not yet wired to `focusAtom`.

## Docs hub

See [`docs/README.md`](docs/README.md).
