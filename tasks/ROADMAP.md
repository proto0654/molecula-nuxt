# Roadmap

## Done

- [x] Vite + TypeScript scaffold
- [x] Fullscreen Three.js hero (scene, camera, renderer, resize, loop)
- [x] Declarative molecule config (`AtomConfig` / `BondConfig` / `MoleculeConfig`)
- [x] Config-driven `Atom` (matte flat icosahedron) + `Bond` (dashed line); `userData.atomId`
- [x] Five-atom test molecule (hub + peripherals on curated orbits)
- [x] Pointer mouse influence via quaternion (`mouseOrientation` / `targetMouseOrientation`, axis-angle, slerp)
- [x] Pure math helpers (`getStableFocusQuaternion`, `getFocusQuaternion`, `getAtomFocusDistance`, orientation, projection)
- [x] Focus orientation layer + `focusStrength ∈ [0,1]`; compose `appliedFocus × mouse × base`
- [x] Atom hover picking (`AtomHover` raycast)
- [x] Billboard atom captions (`AtomLabel`: first letter + remainder; `caption` on config)
- [x] Declarative nav config (`NavigationItem` + `blurb`) + techno HTML overlay; `NavigationState` (atomHover + navHover + committed)
- [x] Hover preview → highlight + pulse reticle (no focus); first click → `focusAtom` + frozen reticle + troika typewriter blurb
- [x] Second click → GSAP `Navigator.navigateTo` (zoom); destination stub + Return (`cancel`)
- [x] AtomSelectionIndicator concentric rings (pulse / freeze); HUD grid + corners; desktop / tablet / mobile layout
- [x] HUD design tokens (`:root` in `styles.css`) + [`docs/DESIGN.md`](../docs/DESIGN.md) decorative patterns
- [x] Render-loop hygiene audit: single matrix update, dirty-gated labels, every-frame selection tick, `visualViewport` / DPR resize, dispose `forceContextLoss`, no hot-path allocs
- [x] QualityManager (`high` / `medium` / `low`) + lock-once performance sample + capped pixel ratio
- [x] Shared low-poly geometry (`GeometryCache`); selected wireframe; quality-gated selection rings + decorative ghost
- [x] Dev-only throttled perf overlay (`DEBUG_PERF` / `?debug=0`)
- [x] Faceted matte graphite look (flatShading icosahedrons, dashed bonds, orbital ghost, selection reticle, no postprocessing)
- [x] HTML sidebar / SVG connectors via `projectAtom` (keep HUD out of WebGL); desktop composition bias

## Next

- [ ] Replace destination stub `onNavigate` with a real router (e.g. Nuxt) using `NavigationItem.route`
- [ ] Richer molecule data
