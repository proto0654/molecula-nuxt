# WebGL Hero Architecture

Fullscreen interactive molecule as the **persistent Nuxt visual shell**. Scene math lives here; routing / freeze / layout: [`SPATIAL.md`](SPATIAL.md).

## Runtime flow

```
layouts/default.vue (persists)
  MolecularHero.vue (ClientOnly, once)
    └─ mountHeroApp.ts
          ├─ QualityManager          start HIGH (MEDIUM on coarse/narrow); ?quality= override
          ├─ canvas (#hero-canvas)   one renderer — not remounted on route change
          ├─ MoleculeController  → home: mouse → orbit-bounded sphere roll (`pointerSpin.ts`) + AtomHover NDC
          │                      → home: touch/pen drag → unbounded trackball; tap → pick
          │                      → home: calibrated gyro (coarse, after sampler lock) → same mouse layer
          │                      → freeze() at approach start and off-home: drop mouse spin, hide labels
          │                      → settled freeze (!busy): lerp selection rings/cross + wireframe → black
          │                      → rAF → compose + zoom/fill → labels (dirty) → selection → hover → onAfterUpdate
          │                         → render → PerformanceSampler (lock-once)
          ├─ SpatialController       spatialFromRoute → setMode / restoreOverview / focus* / freeze
          ├─ HudFrame (stage) / SiteHeader+Navigation (chrome root)
          ├─ HeroAutoplay + HeroSlideProgress (home idle cycle)
          ├─ UspHeadline / NavigationConnector   home-only
          ├─ PerfOverlay + SpatialOverlay        (dev-only)
          ├─ NavigationState
          │     home starts committed to hub (C / Главная) with full readout
          │     (typewriter blurb + armed USP); no unselected / empty rest
          │     hover → highlight / pulse only (no focus)
          │     first click → setCommitted + activateCommittedItem (focus + blurb + USP)
          │     second click same item (not Home) → Navigator.navigateTo
          │     empty canvas / logo → restoreOverview + re-activate hub readout
          ├─ HeroAutoplay (home only)
          │     after focus settle → progress 0→100% (~5.5s) → next committed item
          │     pause on hover / click / mobile menu; resume after ~2s idle
          │     does not call navigateTo — same commit path as first click
          ├─ viewport MQ → setCompositionProfile + connector.enable (desktop ∩ home)
          └─ Navigator.onNavigate
                ├─ item.route (≠ `/`) → TransitionController.transitionTo → Nuxt navigateTo
                └─ else → DestinationView stub (Return → cancel → restoreOverview)
```

- **3D logic** lives under `app/lib/molecular/` and does not import DOM navigation or routes.
- **Pure math** (`app/lib/molecular/math/`) is side-effect free: `getStableFocusQuaternion` (writes into an `out` quaternion), `getFocusQuaternion`, `getAtomFocusDistance`, orientation, `projectToScreenInto`.
- **UI** (`app/lib/hero-ui/*`) never touches Three.js objects. HUD look: [`DESIGN.md`](DESIGN.md) (CSS `:root` tokens + decorative patterns). Title + typewriter blurb are a scene-parented screen-flat troika block (`AtomLabel`). USP headline is DOM (`UspHeadline` + `textScramble`) in the rail↔molecule / header↔molecule void.
- **3D vs screen-space:** Three.js owns the molecule world (atoms, bonds, captions, billboarded selection indicator, wireframe, decorative orbits/nodes) and viewport composition profiles. HTML/CSS/SVG owns grid, corners, header, USP headline, nav rail, mobile overlay, screen-space SVG connectors, transition veil. Bridge: world position → `projectToScreenInto` / `projectAtom` → CSS pixels. Do not drive atom locals from CSS sidebar width.
- **Page transition:** GSAP approach stays in [`Navigator`](../app/lib/navigation/Navigator.ts): zoom+fill, framing, and orbit are **parallel tweens** (not one shared ease). Navigate fires at the end **without an opaque veil**. Route commit ≠ visual reveal: [`poseReveal`](../app/lib/navigation/poseReveal.ts) / `.app-shell.is-awaiting-pose` hides `<NuxtPage>` until the pose is idle. [`completeHandoff`](../app/lib/navigation/Navigator.ts) aborts a foreign timeline — it does not kill a live same-atom approach. Do not use `gsap.ticker.lagSmoothing(0)` during approach — a hitch then slam-finishes the dolly. Home unwinds to rest. Route hop is [`TransitionController.transitionTo`](../app/lib/navigation/TransitionController.ts). Persistent shell: [`SPATIAL.md`](SPATIAL.md).
- **Wiring** lives in [`mountHeroApp.ts`](../app/lib/hero/mountHeroApp.ts) + [`MolecularHero.vue`](../app/components/molecular/MolecularHero.vue) inside [`layouts/default.vue`](../app/layouts/default.vue). Content pipeline: [`CONTENT.md`](CONTENT.md).

## Declarative config

### Molecule

Types in [`app/lib/molecular/types.ts`](../app/lib/molecular/types.ts):

| Type | Fields |
|------|--------|
| `AtomConfig` | `id`, `label` (chemical color key), optional `caption` (section word on the atom), `position`, `radius` |
| `BondConfig` | `id`, `from`, `to` (atom ids) |
| `MoleculeConfig` | `atoms[]`, `bonds[]` |

`MoleculeScene.buildMolecule` iterates config arrays (no hard-coded atom count). Test data: hub `C` at origin + peripherals in [`moleculeConfig.ts`](../app/lib/molecular/moleculeConfig.ts) at **equal spherical angles** about the hub (tetrahedron for 4; Fibonacci otherwise) on **individual** orbits with **varied radii** from [`moleculeOrbits.ts`](../app/lib/molecular/moleculeOrbits.ts) (`buildSphericalOrbitPlacements` / `ATOM_ORBIT_RADIUS`). IDs and bond graph stay stable.

### Navigation

[`navigationConfig.ts`](../app/lib/navigation/navigationConfig.ts):

| Type | Fields |
|------|--------|
| `NavigationItem` | `id`, `label`, `atomId`, `blurb`, optional `blurbCta`, `usp`, optional `route` |
| `NavigationConfig` | `items: NavigationItem[]` |

Helpers: `getItemById`, `getItemByAtomId`. Each nav item maps to exactly one molecule atom id. Atom `caption` is resolved from `navigationConfig` labels via `getItemByAtomId` in [`moleculeConfig.ts`](../app/lib/molecular/moleculeConfig.ts) — keep `items[].atomId` aligned with molecule atom ids; do not duplicate label strings.

Copy (`label`, blurb part 1, optional `blurbCta`, `usp`) is hardcoded in `navigationConfig` for now. On commit, `mountHeroApp` passes `buildAtomBlurb(item)` to `setAtomBlurb` — part 2 is `{кликай|тапай}{blurbCta}` (touch via [`pointerInput.ts`](../app/lib/a11y/pointerInput.ts)); hub skips CTA. Pointer-type changes refresh the active blurb via `subscribePointerInput`. WP migration: [`HERO_WP_FIELDS.md`](HERO_WP_FIELDS.md), [`CONTENT.md`](CONTENT.md) § Hero navigation copy.

## Navigation state

[`NavigationState`](../app/lib/navigation/NavigationState.ts) is the **single source of truth** for the active nav item.

```
activeItemId  = atomHover ?? navHover ?? committed
previewItemId = atomHover ?? navHover
focusItemId   = committed               ← click only; hover never centers
```

| Source | Writer | Role |
|--------|--------|------|
| `atomHoverItemId` | `setAtomHover` (raycast) | Hover preview |
| `navHoverItemId` | `setNavHover` (nav `pointerenter`) | Same preview from the overlay |
| `committedItemId` | commit (`selectItem` / spatial home / restore); starts as `home` | Sticky focus + frozen selection reticle + typewriter readout + USP |

Two-step gesture on **home** (app layer in `mountHeroApp.ts`, not inside Three.js). **Header route links and mobile MENU** bypass this — they call `selectFromMenu` → `navigateTo` in one shot (see below).

While committed, hover of another item shows **dual-state preview** on the hovered atom (pulsing reticle, bright title, static wireframe shell) without stealing focus or zoom. Committed atom keeps frozen reticle, blurb, and its own wireframe.

1. **Hover** (atom raycast or nav): pulsing selection reticle + bright title + static accent wireframe on the preview atom. **No** emissive fill change, `focusAtom`, blurb, or USP. Decorative orbits stay on the **committed** atom (black idle + one light active), not the hover preview.
2. **First click** (atom or **nav rail**): `setCommitted` + `activateCommittedItem` (`focusAtom` + typewriter blurb via `buildAtomBlurb` + arm USP; scramble after `isFocusSettled`). Blurb part 2 prompts a **second click** to navigate (contextual `{кликай|тапай}{blurbCta}`). Cold load, spatial return to `/`, empty-canvas restore, and header logo on home all commit hub `C` with the **same full readout** — there is no intermediate “deselected” home state.
3. **Second click on the same item** (atom or rail): `navigator.navigateTo(atomId)` (single approach: orbit + zoom/fill + framing in parallel). Second click on Home is a no-op.
4. **Header / mobile MENU on home** (one shot): `selectFromMenu` → `navigateTo(atomId)` — no commit step; route fires at the navigate label after the approach pose settles; page stays hidden until idle (`is-awaiting-pose`).
5. **Click another item** (rail / atom): retarget commit + focus (not a page transition).
6. **Empty canvas click / logo on home**: `restoreOverview()` (hub `C`) + re-activate hub blurb/USP; `cancel()` if a transition is busy.

Off-home the molecule is frozen; nav clicks call `transitionTo` immediately. Spatial mapping: [`SPATIAL.md`](SPATIAL.md).

## Orientation (three quaternion layers + focus strength)

Molecule orientation is composed from independent layers. **Focus and base are absolute** — do not overwrite one with another. The mouse layer is an accumulated spin quaternion plus an absolute limited gyro tilt:

```
appliedFocus = slerp(I, focusOrientation, focusStrength)
targetMouse = gyroQ × spinOrientation
final = appliedFocus × mouseOrientation × baseOrientation
```

| State | Location | Role |
|-------|----------|------|
| `baseOrientation` | `MoleculeController` | Rest pose (identity for now) |
| `spinOrientation` | `MoleculeController` | Accumulated free spin (desktop velocity / touch trackball) |
| `mouseOrientation` | `MoleculeController` | Smoothed `gyroQ × spinOrientation` |
| `targetMouseOrientation` | `MoleculeController` | Latest `gyroQ × spinOrientation` (or identity when frozen) |
| `focusOrientation` | `MoleculeController` | Smoothed atom→camera focus pose |
| `targetFocusOrientation` | `MoleculeController` | Absolute target from latest `focusAtom(atomId)` |
| `focusStrength` | `MoleculeController` | Blend weight in `[0, 1]` (smoothed toward `targetFocusStrength`) |
| `targetFocusStrength` | `MoleculeController` | `1` while focused, `0` after `clearFocus` |

Follow rates (`MOUSE_FOLLOW`, `FOCUS_ORIENT_FOLLOW`, `FOCUS_STRENGTH_FOLLOW`) use frame-rate independent damping `1 - exp(-k·Δt)`. **Orbit sweep is the exception:** while `orbitSweepActive`, `focusOrientation` is written directly from `stableFocus * axisAngle(progress · 2π)` so the full revolution cannot take the quaternion short path.

### Mouse layer

Math lives in [`pointerSpin.ts`](../app/lib/molecular/pointerSpin.ts) (no DOM, scratch-free callers).

1. Fine `pointermove` → cursor NDC. Spin offset is cursor minus the **projected molecule origin** (hub / `moleculeGroup` world position) — follows home desktop bias, zoom, and approach. Do not use authored `screenX` / `screenY`. Hover pick still uses true viewport NDC.
2. Each frame: measure the projected peripheral extent from the hub, then `ω = spinSpeedFromRadius(r, limits) * mouseScale`. Limits are derived from that extent (deadzone / peak / fade as fractions) — **zero spin beyond the outer orbits**. Curve: cubic rise, quartic fall (compressed). Axis through the molecule origin, in the camera plane, perpendicular to center→cursor; integrate with `−ω·Δt`. `pointerleave` zeros velocity but keeps the accumulated pose.
3. Touch / pen drag (past ~10px) → unbounded trackball: axis `(dY_down, dX)`, angle from pixel delta / `min(w,h)` × `TOUCH_SPIN_GAIN`. Pose holds on release.
4. `targetMouse = gyroQ × spinOrientation`, then slerp `mouseOrientation` (`MOUSE_FOLLOW`). Under focus, `mouseScale = 1 - focusStrength * (1 - MOUSE_UNDER_FOCUS)` with `MOUSE_UNDER_FOCUS = 0.22` scales **new** spin (velocity / drag), not the existing pose.

`focusAtom` / `freeze` / reduced motion call `resetPointerTilt()` (identity spin + gyro) so the focused atom faces the camera. Desktop spin pauses while a **peripheral** atom is hovered (hub + focused atom excluded). Hover is re-raycast when the pose changes so atoms spinning under a still pointer still trigger the pause. Scratch quaternions / vectors reused; canvas `getBoundingClientRect` cached on resize.

### Gyro layer (touch / coarse)

Gyro is composed onto the same mouse target — not a fourth quaternion: `targetMouse = gyroQ × spinOrientation`. Mapping lives in [`gyroTilt.ts`](../app/lib/molecular/gyroTilt.ts) (calibrated `dGamma` → yaw, weaker `dBeta` → pitch; deadzone + quantize so a still phone holds a constant target and labels can settle).

1. Bind `deviceorientation` only when all of: `sampler.done`, `prefersTouchInput()`, `!frozen`, `!prefersReducedMotion()`, document visible, and iOS permission granted (or not required). Unbind on freeze / stop / hidden.
2. First sample after bind / `focusAtom` (`resetPointerTilt`) / `orientationchange` is the rest pose (identity gyro on top of current spin).
3. Finger down folds live gyro into `spinOrientation` (no jump) and mutes orientation until `pointerup` / `pointercancel`, which recalibrates rest to the last sample.
4. iOS `requestPermission` runs **after** a successful tap pick — never steal the first commit. Deny → drag-only.
5. Canvas hover is skipped on touch: pose changes must not `markDirty` / `updateHover` (stale NDC would raycast the hub and pause autoplay). Tap still uses `pickAt`.

Amplitude is a fraction of `MAX_YAW` / `MAX_PITCH`, attenuated under focus via `GYRO_UNDER_FOCUS` (higher than drag-only `MOUSE_UNDER_FOCUS` because home is always committed).

### Focus layer

1. `focusAtom(atomId)` → rest-frame atom position (`local + moleculeWorld`) + camera world position.
2. `getStableFocusQuaternion(..., out = targetFocusOrientation)` (reference = current `focusOrientation`); set `targetFocusStrength = 1`.
3. `clearFocus()` → `targetFocusStrength = 0` only (keeps last focus pose; influence fades via strength).
4. Each frame: slerp focus orientation (`FOCUS_ORIENT_FOLLOW`), damp `focusStrength`, build `appliedFocus`, compose with attenuated mouse and base, apply to `moleculeGroup`.

Focus follows **click commit** only. Hover never calls `focusAtom`. Mouse keeps applying under focus at reduced amplitude.

**Stable focus math** (`getStableFocusQuaternion`): builds RH orthonormal bases with `+Z = forward` (FROM: atomDir in rest space; TO: cameraDir in world). World up-hint is `referenceQuaternion * localUp`, so twist about the view axis stays close to the current focus orientation. `R = M_to · M_from⁻¹`. No Euler. Degenerate cases (zero atom/camera dir, `up ∥ forward`) copy the reference into `out` or pick an alternate axis. Callers pass a persistent `out` quaternion — no allocation on the focus path.

`getFocusQuaternion` remains as the unconstrained `setFromUnitVectors` baseline; production path uses the stable variant.

## Zoom and fill (scene verbs)

Zoom writes **`moleculeGroup.position` only** — not mixed into quaternion layers. Camera FOV / position stay fixed.

| State | Role |
|-------|------|
| `zoomProgress` / `targetZoom` | `[0, 1]` framing toward the zoom atom |
| `fillProgress` | Extra proximity beyond base framing (atom overflows viewport) |
| `zoomAtomId` | Atom used for framing; cleared when zoom settles at 0 |

Framing distance: [`getAtomFocusDistance`](../app/lib/molecular/math/getAtomFocusDistance.ts) from atom radius + camera FOV (`viewportFill` lerps from base `0.9` toward `1.35` as `fillProgress` → 1). The controller mutates a persistent `focusDistanceOptions` bag each zoom frame (no options-object allocation).

Public scene API (no routes): `focusAtom`, `clearFocus`, `restoreOverview`, `holdApproach`, `settleApproachProgress`, `beginOrbitSweep`, `setOrbitSweepProgress`, `finishOrbitSweep`, `freeze` / `unfreeze` / `setMode`, `setApproachBusy`, `focusSection`, `focusContext`, `focusEntity`, `snapFocus`, `isFocusSettled`, `zoomToAtom`, `clearZoom`, `prepareTransitionTarget`, `setZoomProgress`, `setFillProgress`, `setTransitionDriven`, `setCompositionFramingOverride`, `getActiveCompositionFraming`, `setHighlightedAtom`, `setHaloStates`, `setWireframeAtom`, `setAccentWireframeAtom`, `setBondFlowAtom`, `setAtomTitleHighlight`, `setCaptionsCompact`, `setCaptionRemainderScale`, `setCompositionProfile`, `setCompositionBias`, `projectAtom`, `playEntityLightSweep`, `playArchiveTransitionCue`, `onAfterUpdate`.

Zoom-in waits until `isFocusSettled()` (`focusStrength ≥ 0.92` and orientation within `0.08` rad of target). The same gate starts the HUD USP scramble after commit.

### Composition profiles

[`composition/profiles.ts`](../app/lib/molecular/composition/profiles.ts) defines `desktop` / `tablet` / `mobile` rest framing — **screen-centered by default**. `setCompositionProfile` writes `baseMoleculePosition` from viewport fractions `screenX` / `screenY` (camera right / up) plus `approach` (pull toward camera along look). Derived from FOV + aspect + look-at distance — **never** from measuring CSS chrome. Atom locals stay unchanged. Recomputed on resize. Zoom still layers on top of this rest translation.

`HOME_DESKTOP_FRAMING` (`screenX: 0.62`) is applied only on **home × desktop** via `setCompositionFramingOverride` from `mountHeroApp`. Leave-home `navigateTo` / `approachTo` tween `screenX` / `screenY` / `approach` toward the destination atom's **approach framing** ([`approachFraming.ts`](../app/lib/molecular/composition/approachFraming.ts)) in the approach GSAP pass (same duration as zoom+fill). `applyZoomTranslation` offsets the zoom focus target to that viewport fraction so the atom reads as a half-sphere at the frame edge. Edge framing uses a reduced fill scale (~0.55–0.65 per viewport mode). `retargetApproach` runs focus, a partial zoom dip, and planet→planet framing **in parallel** (no idle focus beat, no full rest unwind).

| Mode | screenX | screenY | approach |
|------|---------|---------|----------|
| desktop | 0.50 | 0.45 | 0 |
| tablet | 0.50 | 0.47 | 0.12 |
| mobile | 0.50 | 0.56 | 0.28 |
| home desktop override | 0.62 | 0.45 | 0 |

**Mobile compact layout** (`MoleculeScene.setCompactLayout`): when mode is `mobile`, orbit span ×0.58; hub radius ×0.58; peripheral radii ×0.78 (peripherals read larger relative to the compact molecule). Hub caption font scales to match peripheral caption size (`peripheral.baseRadius / hub.baseRadius` via `AtomLabel.setFontScale`). Bonds + decorative orbits follow orbit scale. Desktop/tablet keep authored layout.

Committed atom titles use bright ink; idle titles are pure black (`0x000000`) so they do not compete with the focused caption.

### Pointer / touch

- **Mouse (fine):** window `pointermove` → offset from the **projected molecule origin**; each frame the molecule rolls on a screen-perpendicular axis (great-circle toward the cursor) with speed from orbit-bounded limits — zero beyond peripheral orbits. Spin pauses on peripheral atom hover (hub + focused atom excluded). Canvas `click` raycasts. Canvas cursor: `crosshair` default, `pointer` over atom meshes (`#hero-canvas.is-atom-hover` from `onAtomHover`).
- **Touch / pen:** canvas capture; movement &lt; ~10px → tap pick; larger → unbounded trackball spin (pose holds on release). Synthetic click after touch is suppressed. Canvas `touch-action: none`.
- Nav / overlay items use [`tapGuard`](../app/lib/hero-ui/tapGuard.ts) so horizontal scroll-drag does not fire selection.

When `setTransitionDriven(true)`, local zoom damping is skipped — `Navigator` owns progress via GSAP.

### Navigation connector bridge

[`NavigationConnector`](../app/lib/hero-ui/NavigationConnector.ts) polls `projectAtom` in `onAfterUpdate`, reads sidebar anchors from `Navigation.getItemAnchor`, and draws an orthogonal SVG elbow. Endpoint tracks projection synchronously (no lag). Tip + tiny marker stop short of the atom. **Routing:** when `previewItemId !== committedItemId`, the elbow follows the **preview** item (hover on canvas or nav) with `.is-hover` styling; otherwise it tracks the committed item (`.is-active`). Idle / hover / active / zoom fade; soft distance fade when the span is extreme. Desktop-only (`≥1024`).

### USP headline

[`UspHeadline`](../app/lib/hero-ui/UspHeadline.ts) + [`textScramble`](../app/lib/hero-ui/textScramble.ts): short RU USP from `navigationConfig.items[].usp`. Armed whenever a nav item is activated via `activateCommittedItem` (first-click commit, cold home load, spatial return to `/`, empty-canvas / logo restore to hub, **HeroAutoplay advance**). Scramble starts only after `controller.isFocusSettled()`. Uppercase tracked type; ~1s scramble + fade-in. Mobile type is larger than atom captions (`--text-usp` ~1.45–2rem). A hidden measure span locks final line breaks; the display layer is absolutely positioned so scramble never changes layout height; non-letters stay fixed and scramble picks letter glyphs only from the target. Fades with the same zoom/fill softness as the connector. Hover never arms USP. `prefers-reduced-motion` snaps to the final string.

### Hero slide autoplay

[`HeroAutoplay`](../app/lib/hero/HeroAutoplay.ts) cycles committed nav items on **home** when idle. Wired in `mountHeroApp.ts` `onAfterUpdate`; does not import Three.js or touch `NavigationState` directly — advances via the same `setCommitted` + `activateCommittedItem` path as a first click (focus + blurb + arm USP; no `navigateTo`).

| Phase | Behaviour |
|-------|-----------|
| Wait settle | Progress held at 0 until `isFocusSettled()` |
| Fill | Progress 0→1 over `SLIDE_DURATION_MS` (~5500) |
| Advance | Next item in `navigationConfig.items` order (wraps) |
| Next preview | While dwelling (progress filling, no user preview): **pulsing accent wireframe** on the next item's atom (`setAccentWireframeAtom` pulse mode) + **flowing hub bond dashes** toward that atom (`setBondFlowAtom`, dash offset phase-locked to the wireframe pulse) |
| Pause | Hover (atom or nav), manual select, mobile menu open, `navigator.busy`, off-home |
| Resume | ~2s idle after interactions clear (`IDLE_RESUME_MS`) |

[`HeroSlideProgress`](../app/lib/hero-ui/HeroSlideProgress.ts): 1px track + `scaleX` fill. **Desktop (≥1024):** centered in [`SiteHeader`](../app/lib/hero-ui/SiteHeader.ts) (replaces `⟨ SYS · МОЛЕКУЛА ⟩`). **Mobile (≤767):** above bottom nav inside [`Navigation`](../app/lib/hero-ui/Navigation.ts) `nav__stack` (relative flow; `--nav-mobile-bottom` inset from frame). Both instances sync from one `onProgress` callback. Hidden off-home and during approach.

## Page transition (`Navigator` + `TransitionController`)

[`Navigator`](../app/lib/navigation/Navigator.ts) owns a GSAP timeline and [`TransitionState`](../app/lib/navigation/TransitionState.ts). Overlay: [`TransitionOverlay`](../app/lib/hero-ui/TransitionOverlay.ts) acquired via [`routeVeil`](../app/lib/navigation/routeVeil.ts) and parented to `document.body` so it can survive hero unmount. Route hop: [`TransitionController`](../app/lib/navigation/TransitionController.ts).

| API | Role |
|-----|------|
| `navigateTo(atomId)` | Interruptible: focus → parallel approach tweens (zoom+fill `power1.inOut`, framing `power2.inOut`, orbit `none`) → navigate |
| `approachTo(atomId)` | Route already changed, not yet at approach: same parallel approach tweens; no navigate |
| `retargetApproach(atomId)` | Off-home atom change after the route already swapped: parallel focus + zoom dip + planet framing; no second navigate |
| `onNavigate(atomId)` | Forward-only cue at the timeline navigate label |
| `transitionTo(route)` | Nuxt `navigateTo` (handler set in `MolecularHero`); after `handoffRouteVeil()` for real routes |
| `cancel()` | Unwind overlay → approach rewind → clear focus (soft reset; no hard state tear-down) |

Phases: `idle` → `focus` → `approach` → `idle` (busy clears when zoom/fill/orbit have settled so the shell can reveal the page). Legacy `zoom` / `fill` / `overlay` remain in the type for unwind / older snapshots.

Orbit sweep is applied each frame as `stableFocus * axisAngle(progress * 2π)` onto `focusOrientation` — not chased through lagged slerp (shortest-path slerp skips the long way around the ring). Zoom/fill run as their own full-duration tween (`power1.inOut`), not packed into the same `power2.inOut` as the orbit, so a hitch cannot slam the dolly while the spin still reads as a turn. First-click commit prefetches the destination chunk (`preloadRouteComponents`); the page may mount under opacity 0, then fades in after settle. [`useCaseScrollEntry`](../app/composables/useCaseScrollEntry.ts) waits for that reveal before creating ScrollTriggers.

**Current wiring:** `activateCommittedItem` focuses (`focusAtom`), types the blurb, and arms the USP; USP scrambles after `isFocusSettled()`. Used on first-click commit, mount, spatial home apply (`onHomeActivated`), and empty-canvas / logo restore. Second click on the same atom/nav item calls `navigateTo` (approach starts here; focus wait is skipped if already settled). At the navigate label: if `NavigationItem.route` is set and not `/` (e.g. `/portfolio`), `transitionTo`; otherwise show [`DestinationView`](../app/lib/hero-ui/DestinationView.ts) stub (**Return** → `cancel()`). Empty canvas click restores hub with full readout (and `cancel()` if a transition is busy).

`prefers-reduced-motion`: skip approach/connector; hop immediately. Pointer spin on the molecule is also off. Shared helper: [`prefersReducedMotion`](../app/lib/a11y/reducedMotion.ts). Full Home/Archive/Case table: [`CASES.md`](CASES.md) § Page transitions.

## Hover picking, highlight, and selection

[`AtomHover.ts`](../app/lib/molecular/AtomHover.ts): raycasts **atom meshes only** (`MoleculeScene.getAtomMeshes()`). Dirty when pointer NDC changes, molecule quaternion / zoom progress changes, or resize. Enter/leave notifies `mountHeroApp.ts` → `NavigationState.setAtomHover`. Selection rings are siblings of the icosahedron on the atom **Group** (not children of the scaled mesh); labels live on `labelsGroup` (scene). Neither is in `atomMeshes` (empty `raycast`). Decorative ghost geometry and the selection wireframe are also not pick targets.

Highlight is separate from focus orientation: `setHighlightedAtom` is a no-op for mesh fill (atoms use a fixed shell-dim palette). Selection mode (`idle` / `hover` pulse / `committed` freeze) is set via `setHaloStates` (dual committed + preview). Committed wireframe shell: `setWireframeAtom` (static). Hover preview and autoplay-next hint: `setAccentWireframeAtom` (static on hover, pulse while autoplay dwelling). Hub bond dash flow: `setBondFlowAtom` (animated `dashOffset` on the hub→target bond; autoplay phase-locks to accent wireframe pulse; hover uses the same rate). Title brightness: `setAtomTitleHighlight` (committed with blurb + distinct preview). Active decorative orbit: `setActiveOrbitAtom` follows committed atom on home and focused route atom off-home — not hover preview. Nav `.is-active` follows `activeItemId`; `.is-committed` follows `committedItemId`.

**Atom shell fill:** always settled dim — emissive lifts toward `SCENE_BG` with facet contrast from directional key/fill (ambient ~0.24, key ~1.28). No hover/freeze shell mix. `setSweepLightingRelief` still eases dim briefly during entity facet sweep.

**Settled freeze chrome dim:** labels hide instantly in `freeze()`. After the approach timeline settles (`frozen && !approachBusy`), rings / ticks / center cross and both wireframe shells **lerp color** to black (`0x000000`, exp-follow ~6). While `Navigator` is `busy` (live approach / retarget), chrome stays at base colors. `unfreeze` / home cancels the dim. `mountHeroApp` mirrors `transitionState.busy` → `MoleculeController.setApproachBusy`; scene applies via `setChromeDimmed`. Decorative orbits are **not** chrome-dimmed (black idle / dark-gray active palette unchanged).

**Cold / direct route:** `SpatialController` focuses the route atom **before** nav commit so the first `applyVisuals` wires wireframe + reticle to the correct peripheral (not hub `C`). `mountHeroApp.applySpatial` always calls `applyVisuals` after spatial apply; home bootstrap runs only via spatial home branch (`onHomeActivated`), not unconditionally at mount end.

**Frozen entity cues (no molecule spin):**

| Cue | Trigger | Scene |
|-----|---------|-------|
| Facet light sweep | Case/service **slug change** on the same atom (`useCasePageTransition` → [`useMoleculeCue`](../app/composables/useMoleculeCue.ts)) | Subtle `PointLight` sweeps screen-horizontal across flat-shaded facets (~1–1.45s by viewport); direction from prev/next (`moleculeFlipIntent` on `DetailNav` pointerdown, slim-index fallback). Brief `setSweepLightingRelief` on the focused atom. **Does not** blink wireframe or bonds. |
| Wireframe flash | Same-context `portfolio-archive` ↔ `case` or `service-archive` ↔ `service` only (`SpatialController.maybeCueArchiveTransition`; skipped on `immediate` / direct load) | Smooth wireframe opacity + color relief on the focused atom (~0.6s). No reticle scale ping. **Does not** affect bonds or nav connector. |

Pages call `playEntityLightSweep` via a module bridge (`registerMoleculeCue` in `mountHeroApp`; `MolecularHero` must forward the `direction` argument). `prefers-reduced-motion`: cues no-op.

## Quality and performance

[`QualityManager`](../app/lib/molecular/quality/QualityManager.ts) is the lock-once source of truth (`high` | `medium` | `low`). It does **not** retune on resize, hover, or tab blur.

| Level | maxPixelRatio | atomDetail | wireframe | rings | ticks | decorative | material |
|-------|---------------|------------|-----------|-------|-------|------------|----------|
| HIGH | 1.75 | 1 | yes | 3 | yes | yes | `MeshStandardMaterial` |
| MEDIUM | 1.5 | 1 | yes | 2 | no | no | `MeshStandardMaterial` |
| LOW | 1 | 0 | no | 2 | no | no | `MeshLambertMaterial` |

Pixel ratio is always `Math.min(devicePixelRatio, settings.maxPixelRatio)` — never raw `window.devicePixelRatio`.

Startup: HIGH, or MEDIUM when `pointer: coarse` or width ≤ 767. `?quality=high|medium|low` skips sampling and locks that level.

[`PerformanceSampler`](../app/lib/molecular/quality/PerformanceSampler.ts) (after first `render` in `tick`):

1. Skip ~8 warmup frames
2. Record ~45 rAF deltas (already clamped to 50 ms)
3. p95 &lt; 18 ms → HIGH; &lt; 28 ms → MEDIUM; else LOW — **never above** the start heuristic
4. Lock, then watch ~2 s; **one** extra downgrade if still over the current threshold
5. Stop forever

Quality changes call `MoleculeScene.applyQuality` **in place** (swap shared icosahedron geometry, selection ring count, wireframe, decorative visibility, material flavor, pixel ratio). Do **not** `buildMolecule` again — that would drop hover / commit / focus / zoom.

[`GeometryCache`](../app/lib/molecular/resources/GeometryCache.ts) owns unit icosahedron (per detail), edges, unit selection circle / ticks / cross. Atoms keep unique matte flat-shaded materials (emissive highlight). Bonds are dashed `Line`s with a shared `LineDashedMaterial` and per-bond geometry. Cache `dispose()` runs on scene teardown; atom `dispose()` must not dispose shared geometry; bond `dispose()` frees its own line geometry.

Renderer stays a plain `WebGLRenderer` (antialias on, no shadows, no EffectComposer / bloom / SSAO / env maps). Antialias is constructor-only; pixel ratio is the resolution lever.

Dev overlay: [`PerfOverlay`](../app/lib/debug/PerfOverlay.ts) — FPS, frame time, quality, pixel ratio. Mounts when `import.meta.env.DEV && DEBUG_PERF`. Flip `DEBUG_PERF` to `false` or `?debug=0` to hide. DOM text updates ~4 Hz, not every frame.

## Key modules

| File | Role |
|------|------|
| `MoleculeScene.ts` | Scene, camera, renderer, lights, fog, `buildMolecule`, `applyQuality`, dirty-gated labels, selection tick |
| `MoleculeController.ts` | rAF, pointer / touch / gyro / viewport resize, orientation layers, zoom/fill, composition profile, pick, `projectAtom`, selection/caption/wireframe APIs, sampler |
| `composition/profiles.ts` | desktop / tablet / mobile framing (`screenX` / `screenY` / `approach`) + home desktop / center overrides |
| `composition/approachFraming.ts` | Per-atom approach targets: top / bottom / center + edge fill scale |
| `quality/QualityManager.ts` | Lock-once quality presets; `?quality=` / coarse-pointer start heuristic |
| `quality/PerformanceSampler.ts` | Startup sample → lock + one emergency downgrade |
| `resources/GeometryCache.ts` | Shared unit icosahedron / edges / circle / ticks / cross |
| `moleculeOrbits.ts` | One hub orbit per peripheral (varied radius); equal spherical angles |
| `gyroTilt.ts` | Calibrated `beta`/`gamma` → limited yaw/pitch + iOS permission helpers (no Three.js) |
| `AtomHover.ts` | NDC raycast pick; enter/leave listeners |
| `math/focusAtom.ts` | `getStableFocusQuaternion`, `getFocusQuaternion`, camera-framing helper |
| `math/getAtomFocusDistance.ts` | FOV-based distance so an atom radius covers a viewport fraction |
| `math/projection.ts` | `projectToScreenInto` (scratch) / `projectToScreen` |
| `Atom.ts` / `Bond.ts` / `AtomLabel.ts` / `AtomSelectionIndicator.ts` | Group+flat icosahedron, dashed line, two-part caption (JetBrains Mono ttf via troika + `BASE_URL`), screen-flat reticle |
| `DecorativeNodes.ts` | HIGH-only unpickable ghost (one hub orbit per atom + wireframe fragments); idle orbits black, active orbit dark gray via `setActiveOrbitAtom`; fades with zoom/fill |
| `TagCloud.ts` | Decorative troika tags from ACF `hero_tag_cloud` (all quality levels); scene-parented billboard like `AtomLabel`; tier = size + color; not pickable; hides on zoom/fill |
| `moleculeConfig.ts` / `types.ts` | Declarative molecule data; captions pulled from nav labels |
| `navigation/navigationConfig.ts` | RU `NavigationItem[]` + blurbs + optional `blurbCta` + USPs + id/atom lookups |
| `navigation/buildAtomBlurb.ts` | Assemble typewriter string; `{кликай\|тапай}` + CTA tail |
| `a11y/pointerInput.ts` | `(pointer: coarse)` / `(hover: none)` touch heuristic + subscribe |
| `navigation/NavigationState.ts` | atomHover + navHover + committed; `focusItemId`; subscribe |
| `navigation/Navigator.ts` | GSAP page-transition coordinator; `navigateTo` / `approachTo` / `retargetApproach` / `onNavigate` / `cancel` |
| `navigation/routeVeil.ts` | Body-parented overlay acquire / handoff / dismiss across home unmount |
| `navigation/archiveReturn.ts` | `sessionStorage` restore of archive `?page=` + scroll |
| `navigation/TransitionController.ts` | `transitionTo(route)` → Nuxt (handler from MolecularHero) |
| `navigation/TransitionState.ts` | Centralized transition phase / progress snapshot |
| `hero/HeroAutoplay.ts` | Home idle cycle: settle-gated progress, pause/resume, advance callback |
| `hero-ui/HeroSlideProgress.ts` | Desktop header + mobile nav progress track |
| `hero-ui/HudFrame.ts` | Grid + corner ticks (pointer-events none) |
| `hero-ui/SiteHeader.ts` | WebLaba SVG logo (`sign-weblaba.svg`, `assetBaseURL`); home desktop: slide progress + NODE; off-home desktop/tablet: centered route links (direct `transitionTo`); mobile (home + off-home): MENU |
| `hero-ui/UspHeadline.ts` / `hero-ui/textScramble.ts` | HUD USP scramble after focus settle |
| `hero-ui/MobileNavOverlay.ts` | Editorial full-screen mobile nav index |
| `hero-ui/Navigation.ts` | Bottom bar (≤1023) or left rail (≥1024); mobile `nav__stack` (progress + row); `getItemAnchor`; zoom softness |
| `hero-ui/tapGuard.ts` | Tap vs scroll-drag for nav controls |
| `hero-ui/NavigationConnector.ts` | SVG elbow; sync `projectAtom` follow; idle/hover/active/zoom |
| `hero-ui/DestinationView.ts` | Stub section + Return (routes without pages yet) |
| `hero-ui/TransitionOverlay.ts` | Full-viewport veil opacity |
| `debug/PerfOverlay.ts` | Dev-only throttled FPS / quality HUD |
## Scene constraints (current stage)

- Canvas fills the viewport (`100%` / `100dvh`); background `--color-bg` / `0x14161c`. Home locks document scroll via `html.hero-lock`. `html` uses `scrollbar-gutter: stable both-edges` so route transitions do not shift layout when the scrollbar toggles (see [`DESIGN.md`](DESIGN.md) § Document scroll).
- Techno HUD overlay (grid, corners, header, nav rail, mobile overlay, SVG connector) — see [`DESIGN.md`](DESIGN.md). `NavigationItem.route` drives Nuxt when wired (`/portfolio`); other items still use DestinationView stub.
- Responsive: desktop ≥1024 (rail + header progress + composition profile + connector; full captions), tablet 768–1023 (bottom nav on home; off-home header with centered route links), mobile ≤767 (home: header + bottom rail + slide progress + MENU overlay with one-shot leave; off-home: header LOGO + MENU + overlay with direct route hops; mobile framing, full captions, touch trackball/tap + calibrated gyro tilt).
- No postprocessing, bloom, particle systems, physics, realtime shadows, or environment maps. Scene uses a matching `Fog` for slight depth only.
- Pixel ratio capped by the locked quality preset (`maxPixelRatio` 1.75 / 1.5 / 1), refreshed on every resize (monitor / OS DPR changes). Mobile starts MEDIUM (DPR ≤1.5, no ghosts/ticks); sampler may lock LOW (DPR 1, no wireframe). Never disable rotation, touch, raycast, focus, labels, zoom, or navigation.
- GSAP drives the page-transition timeline; idle spin is unused.
## Render-loop hygiene

Separate concerns so nothing hidden reallocates every frame:

| Layer | What |
|--------|------|
| **PER FRAME** | Quaternion follow, zoom translation, one `moleculeGroup.updateMatrixWorld(true)`; connector `projectAtom` + SVG update in `onAfterUpdate` |
| **POINTER** | Raycast only when `AtomHover` is dirty (NDC or pose change); skipped on touch |
| **TRANSFORM DEPENDENT** | Labels when orientation / `zoomProgress` / `fillProgress` changed |
| **STATE DRIVEN** | Highlight / selection / wireframe / blurb / nav from `NavigationState` (`mountHeroApp.ts`) |
| **DECORATIVE** | Selection pulse (early-out when idle); ghost layer HIGH-only, fades with zoom/fill |

| Kind | What |
|------|------|
| **Persistent** | Quaternion layers, zoom/fill, base position, hover/label dirty caches, `focusDistanceOptions` |
| **Temporary (scratch)** | Module/instance `Vector3` / `Quaternion` / `Matrix4` reused across focus math, compose, zoom, labels |
| **Render-time** | Compose → zoom translation → **one** matrix update → dirty-gated labels → selection → dirty-gated hover → `onAfterUpdate` → `render()` → sampler |

Frame order after transforms: single forced matrix update, then labels (only when orientation / `zoomProgress` / `fillProgress` changed, or after resize), then selection indicator (pulse needs elapsed time; skip billboard when idle), then hover (no second matrix force). `projectToScreenInto` uses module/instance scratches. Zoom measurement may still force a matrix pass while measuring the atom at rest translation. HUD / nav / overlay stay off the rAF path.

Resize sizing prefers `window.visualViewport` when present, else `innerWidth` / `innerHeight`. Listeners: `resize`, `orientationchange`, and `visualViewport` `resize` / `scroll` (torn down in `stop()`).

## Build & deploy

| Target | Command | `base` |
|--------|---------|--------|
| Local dev / preview | `npm run dev`, `npm run build`, `npm run preview` | `/` |
| GitHub Pages | push to `main` → [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) | `/molecula-nuxt/` |

Live site: [proto0654.github.io/molecula-nuxt](https://proto0654.github.io/molecula-nuxt/). Fonts live in `public/fonts/` (copied to dist root).

**Subpath gotcha:** Vite rewrites CSS `url('/fonts/…')` at build time, but **JS string literals are not**. Troika and any runtime fetch must prefix with `import.meta.env.BASE_URL` (trailing slash included). Hard-coded `/fonts/JetBrainsMono-Regular.ttf` works locally and 404s on GitHub Pages.

## Gotchas

- Bond connectors are dashed `Line`s inset from atom radii; `computeLineDistances()` is required for `LineDashedMaterial`. Idle bonds share one material; preview/autoplay-next uses a cloned flow material with a shader `dashOffset` (hub → peripheral). Not pick targets.
- Atom materials are matte + `flatShading` (HIGH/MEDIUM standard, LOW lambert). Do not reintroduce Fresnel or high metalness — facets must stay readable.
- Peripheral positions and decorative orbits must stay in sync via [`moleculeOrbits.ts`](../app/lib/molecular/moleculeOrbits.ts) (`ATOM_ORBIT_PLACEMENT` / `buildSphericalOrbitPlacements`). Each peripheral owns one hub-centered orbit (varied radius); directions use equal spherical spacing (not a shared ecliptic). Do not share one ring across multiple atoms or hard-code XYZ. Active orbit color follows highlight via `setActiveOrbitAtom` (black idle / dark gray active).
- Atom colors are a local `COLOR_BY_LABEL` map in `Atom.ts`, not part of `AtomConfig`.
- `AtomLabel`: parented to `labelsGroup` on the **scene**, not the atom mesh. World position follows the atom; `quaternion.copy(camera.quaternion)` keeps the plane screen-flat (no off-axis foreshortening); scale = distance / 4.5 keeps pixel size stable. First letter centered on the surface point toward the camera; remainder `+X`; blurb under the title. Mobile: `setBlurbWrapAtSlash(true)` breaks the typewriter line at the content ` / ` separator; hub `setFontScale` matches peripheral caption pixel size (authored hub radius is larger). Do not parent labels to the mesh or `lookAt` from a rotated parent.
- `TagCloud`: same billboard pattern as `AtomLabel` (scene-parented wrapper, `REF_DISTANCE` scale). Data: `useHeroTagCloud` → `normalizeHeroTagCloud` → `mountHeroApp.setTagCloud`. Troika material must stay `transparent: true` + `depthWrite: false` for SDF edges; tier contrast is **color** (`0x585f67` / `0x424950`), not `fillOpacity`. Not in `atomMeshes`. Hides via `visible` on zoom/fill (no opacity tween).
- `AtomSelectionIndicator`: concentric `LineLoop`s + ticks + center cross parented to the atom **Group**; **screen-flat billboard** via camera quaternion composed against parent world quaternion (not world-tilted); `depthTest` on; not in `atomMeshes`. Quality hides extra rings / ticks; LOW skips the pulse scale wave.
- Atom rest-frame position for focus is `atom.object.position` (the Group), not `mesh.position` (local origin after the unit-icosahedron scale wrap).
- Shared geometries live in `GeometryCache` — do not `geometry.dispose()` on atom/selection teardown. Bond lines own their geometry and dispose it in `Bond.dispose()`. `applyQuality` must not call `buildMolecule`.
- Wireframe shells are decorative; committed (`setWireframeAtom`) + accent preview/autoplay (`setAccentWireframeAtom`); quality may disable both. Never add them to `atomMeshes`.
- Keep `navigationConfig.items[].atomId` aligned with molecule atom ids. Captions/blurbs/USPs/labels are authored once in `navigationConfig` (Russian); `moleculeConfig` reads captions via `getItemByAtomId`.
- Troika captions load JetBrains Mono ttf via `import.meta.env.BASE_URL` + `fonts/JetBrainsMono-Regular.ttf` (Cyrillic). HUD CSS uses the matching `.woff2` from `public/fonts/`. Do not point troika at woff2.
- Hover may **not** call `focusAtom` — preview uses highlight / pulsing reticle / bright title / accent wireframe. Focus comes from `committed` (first click). Zoom starts on the second click via `navigateTo`.
- USP reveal shares `isFocusSettled()` with zoom-in. Arm via `activateCommittedItem` on commit / home restore; do not scramble on hover or before the gate. Fade USP with zoom/fill; dispose with other HUD on HMR. Scramble must use a hidden measure layer + absolute paint layer + target-letter charset — a wide random charset or layout-affecting `textContent` will jump lines (especially on mobile where the block is vertically centered).
- Do not put route / history / `navigateTo` inside `MoleculeController` click handling — pick notifies; app layer decides.
- Mid-flight `navigateTo` retargets without hard-resetting zoom/fill/overlay; `cancel` builds an unwind timeline from live values (do not `timeline.reverse()` after a retarget that started mid-progress).
- While `Navigator.busy` (including `complete`), `mountHeroApp.ts` skips hover-driven focus updates.
- Focus uses **rest-frame** atom position (ignore current group rotation) so the focus quaternion stays absolute and independent of the mouse layer.
- `setCompositionProfile` must use FOV/aspect only — never `getBoundingClientRect` on the sidebar. Atom locals stay fixed. Prefer profiles over ad-hoc `setCompositionBias`.
- `NavigationConnector` consumes screen pixels only (`projectAtom` + DOM anchors). Do not import scene graph objects into UI modules. Tip + tiny marker stop short of the atom.
- Desktop rail / header / connector are CSS ≥1024; tablet keeps bottom nav on home; mobile home uses header + compact rail + MENU overlay (one-shot leave); mobile off-home uses header LOGO + MENU overlay (direct hops) and hides the connector.
- `clearFocus` only lowers `focusStrength`; do not slerp focus orientation to identity on leave (avoids a long unused arc).
- Central / Home atom (zero offset): no unique focus forward — on enter, apply a π flip about a random axis from the current focus pose (idempotent while already focused on hub). Peripheral focus uses `getStableFocusQuaternion`. **Hero leave approach** (peripherals only): one full revolution (2π) about the atom's orbit normal **in parallel with** zoom+fill (separate GSAP tweens) — ends back on the settled facing pose. `focusAtom` also clears residual pointer/touch/gyro spin so the atom faces the camera.
- Do not write `moleculeGroup.rotation.x/y += …`; apply composed absolute layers each frame (no rotation accumulation).
- Do not `new Vector3` / `new Quaternion` / options literals inside `tick` / `update` — use scratches and persistent options bags.
- Desktop spin math lives in [`pointerSpin.ts`](../app/lib/molecular/pointerSpin.ts): projected hub origin, orbit extent limits, screen-perpendicular roll axis; conjugate by inverse applied-focus so the on-screen axis stays correct under focus.
- Hover re-raycasts when pose changes (spin under a still pointer); peripheral hover pauses desktop spin (hub + focused atom excluded).
- Gyro must write `targetMouseOrientation` (composed with drag); do not add a fourth quaternion layer or `moleculeGroup.rotation +=`. Recalibrate rest on focus / drag-end / `orientationchange`. Do not bind until `PerformanceSampler` has locked.
- Dispose path: HMR / home unmount disposes navigator, destination, USP, hud, nav, controller. `Navigator.dispose()` kills the timeline and calls `releaseRouteVeil()` — the overlay is **not** removed if it was handed off to the destination page. `MoleculeScene.dispose` clears meshes, `renderer.dispose()`, then `forceContextLoss()`.
- Graphite colors in `COLOR_BY_LABEL` must stay darker than caption ink (see [`DESIGN.md`](DESIGN.md) scene tokens).
