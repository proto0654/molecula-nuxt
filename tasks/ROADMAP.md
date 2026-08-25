# Roadmap

## Done

- [x] Vite + TypeScript scaffold
- [x] Fullscreen Three.js hero (scene, camera, renderer, resize, loop)
- [x] Declarative molecule config (`AtomConfig` / `BondConfig` / `MoleculeConfig`)
- [x] Config-driven `Atom` (sphere) + `Bond` (oriented cylinder); `userData.atomId`
- [x] Five-atom test molecule (methane-like)
- [x] Pointer mouse influence via quaternion (`mouseQuaternion` / `targetMouseQuaternion`, slerp)
- [x] Pure math helpers (`getStableFocusQuaternion`, `getFocusQuaternion`, orientation, projection)
- [x] Focus orientation layer on controller (`focusAtom`, `focusStrength`, compose with mouse)
- [x] Atom hover picking (`AtomHover` raycast)
- [x] Mount billboard / readable atom labels (`AtomLabel` via troika-three-text)
- [x] Declarative nav config (`NavigationItem`) + HTML overlay; dual-hover `NavigationState`
- [x] Wire navigation state → `focusAtom` / `clearFocus` + atom highlight (synced with nav `.is-active`)

## Next

- [ ] Optional GSAP camera motion on focus
- [ ] Richer molecule data / committed nav selection (click → `setCommitted`)
- [ ] Visual polish without heavy postprocessing (unless explicitly required)
