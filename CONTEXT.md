# Context

Interactive WebGL hero prototype for a molecule visualization block.

## Stack

- Vite + TypeScript (no React / Vue / R3F)
- Three.js
- GSAP
- troika-three-text (3D atom labels via `AtomLabel`)

## Entry points

- App bootstrap / wiring: [`src/main.ts`](src/main.ts)
- Scene / render loop: [`src/3d/MoleculeController.ts`](src/3d/MoleculeController.ts), [`src/3d/MoleculeScene.ts`](src/3d/MoleculeScene.ts)
- Molecule data: [`src/3d/moleculeConfig.ts`](src/3d/moleculeConfig.ts) (`MoleculeConfig`)
- Navigation: [`src/navigation/navigationConfig.ts`](src/navigation/navigationConfig.ts) → [`NavigationState`](src/navigation/NavigationState.ts) → [`src/ui/Navigation.ts`](src/ui/Navigation.ts)

## Current focus

Config-driven molecule with dual orientation layers (`focusQuaternion × mouseQuaternion`). Declarative HTML nav (`NavigationItem` → atom id) shares `NavigationState` with atom raycast hover; `main.ts` bridges state to `focusAtom` / `clearFocus` and emissive highlight. No client router yet (`route` is data only).

## Docs hub

See [`docs/README.md`](docs/README.md).
