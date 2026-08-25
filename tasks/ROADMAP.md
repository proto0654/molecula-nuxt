# Roadmap

## Done

- [x] Vite + TypeScript scaffold
- [x] Fullscreen Three.js hero (scene, camera, renderer, resize, loop)
- [x] Declarative molecule config (`AtomConfig` / `BondConfig` / `MoleculeConfig`)
- [x] Config-driven `Atom` (sphere) + `Bond` (oriented cylinder); `userData.atomId`
- [x] Five-atom test molecule (methane-like)
- [x] Pointer mouse influence via quaternion (`mouseQuaternion` / `targetMouseQuaternion`, slerp)
- [x] Navigation state + Prev/Next DOM shell
- [x] Pure math helpers (`focusAtom`, orientation, projection)

## Next

- [ ] Wire navigation to camera focus (`focusAtom` + GSAP; compose with mouse layer)
- [ ] Mount billboard / readable atom labels (`AtomLabel`)
- [ ] Richer molecule data / interaction (hover, pick)
- [ ] Visual polish without heavy postprocessing (unless explicitly required)
