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

Matte flat-shaded icosahedron atoms, dashed-line bonds, and orbital placement (`moleculeOrbits`) under lock-once `QualityManager`. Desktop: left nav rail + header + SVG connector via `projectAtom`, composition profile `0.62`. Mobile: composition profile + compact hub/orbits (×0.7), site header + `/ NAV` rail + MENU overlay, touch drag/tap. Idle captions pure black; committed caption bright. Hover = highlight + pulse reticle (no centering). First click = `focusAtom` + typewriter blurb. Second click = `Navigator.navigateTo` (zoom → fill → stub) with Return. HUD stays HTML/CSS/SVG. No client router (`route` is data only).

## Docs hub

See [`docs/README.md`](docs/README.md). HUD tokens and decorative patterns: [`docs/DESIGN.md`](docs/DESIGN.md).
