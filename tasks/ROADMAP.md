# Roadmap

## Done

- [x] Vite + TypeScript scaffold
- [x] Fullscreen Three.js hero (scene, camera, renderer, resize, loop)
- [x] Declarative molecule config (`AtomConfig` / `BondConfig` / `MoleculeConfig`)
- [x] Config-driven `Atom` (sphere) + `Bond` (oriented cylinder); `userData.atomId`
- [x] Five-atom test molecule (methane-like)
- [x] Pointer mouse influence via quaternion (`mouseQuaternion` / `targetMouseQuaternion`, slerp)
- [x] Navigation state + Prev/Next DOM shell
- [x] Pure math helpers (`getStableFocusQuaternion`, `getFocusQuaternion`, orientation, projection)
- [x] Focus orientation layer on controller (`focusAtom`, `focusStrength`, compose with mouse)
- [x] Atom hover picking (`AtomHover` raycast; debug overlay in `main.ts`)

## Next

- [ ] Wire navigation to `MoleculeController.focusAtom` (+ optional GSAP camera motion)
- [ ] Mount billboard / readable atom labels (`AtomLabel`)
- [ ] Richer molecule data / interaction beyond hover debug
- [ ] Visual polish without heavy postprocessing (unless explicitly required)
