# Context

Interactive WebGL hero prototype for a molecule visualization block.

## Stack

- Vite + TypeScript (no React / Vue / R3F)
- Three.js
- GSAP (page-transition timeline in `Navigator`)
- troika-three-text (screen-flat atom captions via `AtomLabel`)

## Live preview

- Repository: [github.com/proto0654/molecule](https://github.com/proto0654/molecule)
- GitHub Pages (push to `main`): [proto0654.github.io/molecule](https://proto0654.github.io/molecule/)
- Local: `npm run dev` / `npm run build` / `npm run preview`

## Entry points

- App bootstrap / wiring: [`src/main.ts`](src/main.ts)
- Scene / render loop: [`src/3d/MoleculeController.ts`](src/3d/MoleculeController.ts), [`src/3d/MoleculeScene.ts`](src/3d/MoleculeScene.ts)
- Molecule data: [`src/3d/moleculeConfig.ts`](src/3d/moleculeConfig.ts) (`MoleculeConfig`, `caption` on atoms)
- Navigation / transition: [`navigationConfig`](src/navigation/navigationConfig.ts) → [`NavigationState`](src/navigation/NavigationState.ts) → [`Navigator`](src/navigation/Navigator.ts) + [`src/ui/`](src/ui/) overlay

## Current focus

Matte flat-shaded icosahedron atoms, dashed-line bonds, and **spherical** orbital placement (`buildSphericalOrbitPlacements`, one orbit per peripheral, varied radii) under lock-once `QualityManager`. UI copy is **Russian** with self-hosted JetBrains Mono (CSS woff2 + troika ttf). Desktop: left nav rail + header (`⟨ SYS · МОЛЕКУЛА ⟩` centered) + SVG connector via `projectAtom`, composition profile `0.62` / `screenY 0.45`. Mobile: composition profile + compact layout (orbit ×0.58, hub ×0.58, peripherals ×0.78; hub caption font matches peripherals), site header + `/ NAV` rail + MENU overlay, touch drag/tap. HUD USP headline (scramble after focus settle; larger than atom captions on mobile). Canvas cursor `pointer` over atoms. Idle captions pure black; committed caption bright. Hover = highlight + pulse reticle (no centering). First click = `focusAtom` + typewriter blurb. Second click = `Navigator.navigateTo` (zoom → fill → stub) with Return. Mouse tilt attenuates under focus. HUD stays HTML/CSS/SVG. No client router (`route` is data only).

## Docs hub

See [`docs/README.md`](docs/README.md). HUD tokens and decorative patterns: [`docs/DESIGN.md`](docs/DESIGN.md).
