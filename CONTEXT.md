# Context

Interactive WebGL hero prototype for a molecule visualization block.

## Stack

- Vite + TypeScript (no React / Vue / R3F)
- Three.js
- GSAP
- troika-three-text

## Entry points

- App bootstrap: [`src/main.ts`](src/main.ts)
- Scene / render loop: [`src/3d/MoleculeController.ts`](src/3d/MoleculeController.ts), [`src/3d/MoleculeScene.ts`](src/3d/MoleculeScene.ts)
- Molecule data: [`src/3d/moleculeConfig.ts`](src/3d/moleculeConfig.ts)
- Navigation UI: [`src/ui/Navigation.ts`](src/ui/Navigation.ts) → [`src/navigation/NavigationState.ts`](src/navigation/NavigationState.ts)

## Current focus

Base fullscreen hero scene: camera, renderer, resize, animation loop, minimal H₂O molecule (atoms, bonds, labels), idle rotation, Prev/Next atom navigation shell. No postprocessing or complex visual effects yet.

## Docs hub

See [`docs/README.md`](docs/README.md).
