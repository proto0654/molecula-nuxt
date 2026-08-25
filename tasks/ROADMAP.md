# Roadmap

## Done

- [x] Vite + TypeScript scaffold
- [x] Fullscreen Three.js hero (scene, camera, renderer, resize, loop)
- [x] Declarative molecule config (`AtomConfig` / `BondConfig` / `MoleculeConfig`)
- [x] Config-driven `Atom` (sphere) + `Bond` (oriented cylinder); `userData.atomId`
- [x] Five-atom test molecule (methane-like)
- [x] Pointer mouse influence via quaternion (`mouseOrientation` / `targetMouseOrientation`, axis-angle, slerp)
- [x] Pure math helpers (`getStableFocusQuaternion`, `getFocusQuaternion`, `getAtomFocusDistance`, orientation, projection)
- [x] Focus orientation layer + `focusStrength ∈ [0,1]`; compose `appliedFocus × mouse × base`
- [x] Atom hover picking (`AtomHover` raycast)
- [x] Billboard atom captions (`AtomLabel`: first letter + remainder; `caption` on config)
- [x] Declarative nav config (`NavigationItem` + `blurb`) + techno HTML overlay; `NavigationState` (atomHover + navHover + committed)
- [x] Hover preview → highlight + pulse halo (no focus); first click → `focusAtom` + frozen halo + troika typewriter blurb
- [x] Second click → GSAP `Navigator.navigateTo` (zoom); destination stub + Return (`cancel`)
- [x] AtomHalo concentric rings (pulse / freeze); HUD grid + corners; desktop / tablet / mobile layout
- [x] HUD design tokens (`:root` in `styles.css`) + [`docs/DESIGN.md`](../docs/DESIGN.md) decorative patterns
- [x] Render-loop hygiene audit: single matrix update, dirty-gated labels, every-frame halo, `visualViewport` / DPR resize, dispose `forceContextLoss`, no hot-path allocs

## Next

- [ ] Replace destination stub `onNavigate` with a real router (e.g. Nuxt) using `NavigationItem.route`
- [ ] Richer molecule data
- [ ] Visual polish without heavy postprocessing (unless explicitly required)
