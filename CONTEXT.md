# Context

Interactive WebGL hero prototype for a molecule visualization block.

## Stack

- Vite + TypeScript (no React / Vue / R3F)
- Three.js
- GSAP (page-transition timeline in `Navigator`)
- troika-three-text (screen-flat atom captions via `AtomLabel`)

## Entry points

- App bootstrap / wiring: [`src/main.ts`](src/main.ts)
- Scene / render loop: [`src/3d/MoleculeController.ts`](src/3d/MoleculeController.ts), [`src/3d/MoleculeScene.ts`](src/3d/MoleculeScene.ts)
- Molecule data: [`src/3d/moleculeConfig.ts`](src/3d/moleculeConfig.ts) (`MoleculeConfig`, `caption` on atoms)
- Navigation / transition: [`navigationConfig`](src/navigation/navigationConfig.ts) → [`NavigationState`](src/navigation/NavigationState.ts) → [`Navigator`](src/navigation/Navigator.ts) + [`src/ui/`](src/ui/) overlay

## Current focus

Fullscreen techno HUD over the molecule. Hover = highlight + pulse halo (no centering). First click = `focusAtom` + typewriter blurb. Second click = `Navigator.navigateTo` (zoom → fill → stub) with Return. Captions are scene-parented screen-flat troika (title + blurb). HUD tokens: [`docs/DESIGN.md`](docs/DESIGN.md) / `src/styles.css` `:root`. No client router (`route` is data only).

## Docs hub

See [`docs/README.md`](docs/README.md). HUD tokens and decorative patterns: [`docs/DESIGN.md`](docs/DESIGN.md).
