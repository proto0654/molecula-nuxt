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

Matte flat-shaded icosahedron atoms, dashed-line bonds, and orbital placement (`moleculeOrbits`) under lock-once `QualityManager`. Desktop composition: left nav rail + header + SVG connector via `projectAtom`, molecule framed with `setCompositionBias(0.62)`, WebGL crosshair behind hub (`CompositionGuides`). Hover = highlight + pulse reticle (no centering). First click = `focusAtom` + typewriter blurb. Second click = `Navigator.navigateTo` (zoom → fill → stub) with Return. Captions stay scene-parented troika. HUD stays HTML/CSS/SVG. No client router (`route` is data only).

## Docs hub

See [`docs/README.md`](docs/README.md). HUD tokens and decorative patterns: [`docs/DESIGN.md`](docs/DESIGN.md).
