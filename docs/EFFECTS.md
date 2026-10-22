# Molecular atmosphere effects

Atmosphere layer for the persistent molecule. Code: [`MoleculeEffects.ts`](../app/lib/molecular/effects/MoleculeEffects.ts).
Pose, freeze and route semantics stay in [`SPATIAL.md`](SPATIAL.md); this document only covers the
visual field around the focused atom.

## Design intent

The field reads as a **drafting / measurement instrument**, not a game VFX layer:

- 1px hairlines and soft additive light, same palette as the HUD (`#6ec99f` / `#a8e0c4`).
- Home is **data**, not atmosphere for its own sake: dust drifts on a shell around the hub, a
  share of it streams along the bond toward the atom that will be activated next, and a further
  share converges on that atom's own shell — the same dive the hub gets when it is the next atom.
- Peripheral routes are **still**: one drafting shell pinned in place — no rotation, no scale drift,
  no comet and no stream.
- No postprocessing, no bloom pass, no render targets, no second canvas or renderer.
- The molecule pose, focus and freeze logic are untouched. The field attaches to the focused
  atom and is rendered inside the existing scene.

The reveal uses the same cadence as the HTML listings: `1.25s` draw, `55ms` per-layer stagger
(see [`MOTION.md`](MOTION.md) and the hairline language in [`DESIGN.md`](DESIGN.md)).

The enter-time dust shed by listing hairlines is **page-space DOM**, not part of this
atmosphere layer — see [`MOTION.md`](MOTION.md#hairline-dust). It reuses the `0x7e8994`
dust ink and the accent but has no `Points` draw call, no scene uniform and no scroll input.

## Layers

| Layer | Module | Draw cost | Home | Frozen route |
|-------|--------|-----------|------|--------------|
| Data dust | [`ParticleMist.ts`](../app/lib/molecular/effects/ParticleMist.ts) | 1 `Points` | shell drift + hub→next bond stream + shell dive onto the next peripheral atom (hub target → shell dive) | ambient drift only (stream gated off) |
| Atom rim | [`AtomRim.ts`](../app/lib/molecular/effects/AtomRim.ts) | 1 per atom | back-side fresnel edge | **off** (see gotcha) |
| Drafting shell | [`AtomField.ts`](../app/lib/molecular/effects/AtomField.ts) | 1 line | one soft-light rotating shell | one gray shell, fixed pose |
| Orbit comet | [`OrbitComet.ts`](../app/lib/molecular/effects/OrbitComet.ts) | 1 line | **upcoming** atom's orbit (hover / next) | **off** |

The orchestrator is [`MoleculeEffects.ts`](../app/lib/molecular/effects/MoleculeEffects.ts). It owns
the fade/reveal clock, focus pulse and upcoming-atom target; sub-effects only write
uniforms/transforms.

## Upcoming atom (hover / autoplay-next)

The approach pose turns the focused atom toward the viewer, so the committed orbit reads almost
edge-on. Motion is therefore pointed at the atom the user will land on:

| Signal | Home | Frozen route |
|--------|------|--------------|
| Orbit comet | hovered atom, else autoplay-next **from the commit frame** | off |
| Dust stream | hub → same upcoming atom, re-emitted on every target change | off |
| Atom dive | shell → **upcoming peripheral atom itself**, riding the same stream clock | off |

The bond stream lands on the atom and vanishes; the dive rows back that arrival
with the effect the hub already had: points are born on a shell around the
upcoming atom (`2.2 × atom radius`) at a fresh random bearing, spiral onto its
surface and die on contact. It runs on the same stream clock (`uTime`), so both
parts of the effect are re-emitted on the target frame and arrive together;
sizing, accent, fog fade and the per-point launch/travel/period loop are
identical to the hub dive ([`spiralFall`](../app/lib/molecular/effects/ParticleMist.ts)
in the vertex shader). It is gated by `uDiveGate`, so a hub target — whose own
dive owns the stream rows — and off-home states draw none of it.

The hub atom `C` is a valid upcoming target (hover over the centre, or autoplay-next wrapping to
`home`). It owns no bond and has no orbit placement, so the regular comet + bond stream would be
dead there. The **same stream rows** run a different trajectory instead: points are born on a shell
around the hub (`2.2 × hub radius`) at a fresh random bearing and spiral onto its surface, then
vanish — the per-point launch/travel/period loop, sizing, fog fade and alpha are unchanged. The
comet stays hidden (there is nothing to lap) and the pulsing accent wireframe / reticle still mark
the hub as the upcoming atom.

`mountHeroApp.resolveUpcomingAtomId()` is the single source (`NavigationState` preview or
`HeroAutoplay.getNextItemId()` via `isNextHinted()`). It reaches the scene as
`setUpcomingAtom` / `setActiveOrbitAtom`, which both funnel into
`MoleculeEffects.setTarget(upcomingAtomId, orbitAtomId)` so the comet birth and the dust
re-emission land on the same frame.

**Timing.** The highlight is gated on `isNextHinted()` (dwelling *or* `awaitingTurn`), not on
`isFocusSettled()`. `HeroAutoplay.syncIndex` arms `awaitingTurn` the moment the committed item
changes, so the hint is live on the commit frame; `activateCommittedItem` also calls
`applyUpcomingFocus()` right after `focusAtom`. Measured: dust + orbit are lit at ~90ms after the
autoplay commit while `fill ≈ 0`, i.e. before the slide clock starts. A **manual select**
(atom click, HUD, connector) goes through `HeroAutoplay.selectCommitted`: the slide clock rewinds
to 0 for the idle hold, but `hintWhilePaused` keeps the next atom hinted for the whole hold, so the
effects move on the click frame instead of after the ~2s idle resume. Any **user hold** (hover
preview, manual select, open menu) also rewinds the slide phase to 0: `isHolding()` freezes the
comet age and the dust stream clock through `EffectsFrameState.scenarioHeld`, and
`consumeCycleRestart()` → `MoleculeController.restartUpcomingCycle()` restarts both from their
first frame when the hold expires, so the progress bar and the effects never resume out of phase.
A hover preview of another atom owns the target and keeps animating; its target change restarts
the scenario on the next atom when the pointer leaves. Hovering the atom that was just committed
keeps the hint latched instead of dropping it.

The comet arc starts at the atom's own orbital angle (`placement.theta`) and unwinds from there
with `easeOutCubic` over the growth window. **Every new target restarts it** at that atom
(`OrbitComet.setTarget` → `age = 0`), so the arc is always born *at the hover / next atom*, never
somewhere mid-ring; the old arc is discarded. The head laps the ring exactly once per active-atom
cycle (`COMET_CYCLE_SECONDS = 5.5s`, the autoplay slide), so the loop stays in phase with the
cycle. `HeroAutoplay.awaitingTurn` keeps the slide progress moving through the turn
(`getTurnProgress() ≥ 0.35`) so autoplay does not visibly stall between slides.

The same instance also flies the **home boot chain**: `setBootArc(atomId, head, progress, opacity)`
freezes the target loop and drives head / arc / opacity from the intro clock, so one comet runs the
four orbits in order — head from `θ+π` to the atom's `θ`, one half lap per leg — and each atom
appears where the head lands. `setBootArc(null)` hands the arc back to `setTarget`.

## Hub connector

The static dashed hub→atom bond stays visible again. Only the animated dash flow
(`setBondFlowAtom`) remains retired; the stream now hugs the same connector.

## Committed atom outline

The static white wireframe shell on the committed atom is **retired**
([`MoleculeScene.setWireframeAtom`](../app/lib/molecular/MoleculeScene.ts) is a no-op). The
outline now belongs to the upcoming atom only (`setAccentWireframeAtom`: static on hover, pulsing
for autoplay-next), and the committed atom keeps its reticle.

## Quality grades

[`quality/presets.ts`](../app/lib/molecular/quality/presets.ts) is the single source of truth.

| Level | Dust rows | Drift | Rim | Comet |
|-------|-----------|-------|-----|-------|
| HIGH | 170 | yes | yes | yes |
| MEDIUM | 162 | yes | yes | yes |
| LOW | 154 | **no** | no | no |

- Dust rows are authored once: a sparse stream, the atom-dive rows, then an ambient shell
  (`AMBIENT_POINTS = 70`). A lower grade only shrinks the draw range, so the stream and the dive
  are never cut. Quality changes never rebuild attributes.
- HIGH/MEDIUM keep the rims and the ambient drift; LOW freezes the ambient shell and drops the
  full-screen fill costs (rims).

## Data dust (particles)

One `Points` call, 154–170 rows, hard square 1–5px, no sprite texture and no soft disc — few
points, chunky and legible, cheap to fill.

| Property | Implementation |
|----------|----------------|
| Drift | vertex shader from `uAmbientTime` (monotonic `elapsed`); yaw + pitch of a thin shell around the hub (`dustDrift` off on LOW) |
| Bond stream | `STREAM_RATIO = 0.18` rows; each point has its **own loop**: launch delay → travel to the atom → vanish on arrival → wait out its own period (5.2–7.0s) → launch again |
| Atom dive | `ATOM_DIVE_RATIO = STREAM_RATIO` (50 rows at the 280 ceiling): the hub dive copied onto the upcoming peripheral atom (`uDiveFrom` / `uDiveOuter` / `uDiveInner`, gate `uDiveGate`), same loop, contact fade and density |
| Hub dive | the stream rows when the upcoming atom is the hub: `uLinkMode = 1` switches the trajectory to `uFallFrom` + a per-cycle random bearing, radius `uFallOuter → uFallInner`, with a tangential `FALL_SWIRL`; contact fade starts at `0.88` so a point dies on the surface |
| Re-emission | a new target resets the local stream clock (`uTime`); the whole stream and the dive are destroyed and re-emitted, never resumed mid-flight |
| Hold | `EffectsFrameState.scenarioHeld` freezes `uTime` (and the comet age) while autoplay is held; `restartUpcomingCycle()` resets it to 0 together with the slide phase, so the stream re-enters on the same frame as the progress bar |
| Route gate | stream and dive rows are hard-gated by `uStreamGate` (`setStreamEnabled`): off home they draw none of them, so the idle residue never keeps flying at the last target |
| Two clocks | stream `uTime` (restarted per target) and ambient `uAmbientTime` (never restarted) are separate uniforms — a hover must not snap the ambient shell |
| Spacing | each period re-rolls the launch phase and a **narrow** lateral cone around the hub→atom connector, so the flow is continuous, tight and never repeats a path |
| Lifecycle | a point is visible only while `0 ≤ age ≤ travel`; it never parks on the destination atom |
| Sizing | `DUST_POINT_PX` (3.4), same square for stream and ambient; clamped 1–5 |
| Depth | dot faded with the **scene fog** (`Fog` / `FogExp2` mirrored into `uFogNear/Far/Density`) |
| Brightness | fades in at the hub mouth and out on arrival at the atom |
| CPU | uniforms only; bond anchors recomputed on target change, never per frame |
| Transform | object mirrors `moleculeGroup`, so `local` is molecule space and anchors survive spin |

GLSL gotcha: module constants (`TAU`, `HUB_YAW`, `HUB_PITCH`) must be **injected as literals** —
GLSL has no access to JS scope and a bare identifier fails shader compilation silently (the layer
then renders nothing). A broken shader is only visible via console errors, not the build.

## Route motion

A frozen route is deliberately **scroll-free**: routing no longer feeds the atmosphere layer, so
there is no `scroll` listener and no per-frame layout read. Off home the shell keeps one fixed
orientation, scale and opacity, and nothing else in the field animates except the ambient dust drift
(and even that stops on LOW). Reduced motion freezes the remaining clocks.

## Freeze at any atom size

A centre-approach atom can fill the viewport. Its silhouette, reticle and single drafting shell may
all be off-screen, so the freeze signature is built from **surface-level** layers:

1. Rims are switched off once frozen. A back-side fresnel shell on a planet-sized atom floods the
   viewport (the camera sits close).
2. The single drafting shell stays on the atom in one fixed pose — no rotation, no scroll-driven
   scale or opacity, on any grade. There is no blurred additive band and no horizon ring.

The field fades out while `approachBusy` and back in after settle, so it never competes with the
route transition. `freeze()`/`unfreeze()` and zoom/fill are unchanged. On a direct load of `/` the
field and rims are gated by `EffectsFrameState.introReveal` and arrive with the last comet legs,
while the ambient dust has its own spawn clock: `EffectsFrameState.introDust` drives `uBoot`, every
point starts at the hub centre and spirals out to its radius (the hub dive mirrored, each on its own
launch delay) — see [MOTION.md](MOTION.md#home-boot-direct-load).

## Performance budget

- HIGH: about 8 extra draw calls (5 rims + shell + dust + comet);
  MEDIUM: 8; LOW: 2 (no rims/comet, one shell + dust).
- CPU: uniform and transform writes only; no per-frame allocations; rims iterate the five atoms.
- Static buffers: 170 dust rows max, visible count via `setDrawRange`; the single shell reuses
  `GeometryCache` edges.
- Pixel ratio remains capped by the quality preset. No glow, no blurred sweep, no surface lattice,
  no postprocessing chain, no shadows, no environment maps.

## Reduced motion

- `elapsed` is clamped to `0` for all effect clocks.
- The shell stays static, the comet holds its arc, the dust stream is gated off away from home.
- No focus pulse, no breathing opacity. The field remains as a static drafting overlay.

## Tuning

| Constant | File | Effect |
|----------|------|--------|
| `SHELL_HOME_OPACITY` / `SHELL_FROZEN_OPACITY` | `AtomField.ts` | single shell weight per state |
| `SHELL_SPEED` | `AtomField.ts` | home-only continuous shell spin |
| `MAX_PARTICLES` / `STREAM_RATIO` / `ATOM_DIVE_RATIO` / `AMBIENT_POINTS` | `ParticleMist.ts` | dust budget, stream share, peripheral-dive share, ambient shell size |
| `DUST_POINT_PX` | `ParticleMist.ts` | square point size (1–5 clamp) |
| `STREAM_LAUNCH_DELAY` | `ParticleMist.ts` | pause before the first points start after a target change |
| `STREAM_TRAVEL_SECONDS` / `STREAM_PERIOD_MIN` / `STREAM_PERIOD_MAX` | `ParticleMist.ts` | travel time and per-point loop period |
| stream `phase` / `scatter` hashes | `ParticleMist.ts` (vertex shader) | random launch + tight cone per period, no repeated path |
| `FALL_OUTER_RADIUS` / `FALL_INNER_RADIUS` / `FALL_SWIRL` | `ParticleMist.ts` | hub dive: birth shell, contact radius (in hub radii) and spiral sweep |
| `DUST_FOG_NEAR` / `DUST_FOG_FAR` | `ParticleMist.ts` | far-dust dissolve |
| `COMET_CYCLE_SECONDS` / `COMET_GROW_SECONDS` | `OrbitComet.ts` | one lap per active-atom cycle; unfurl time |
| comet `intensity` (`1` upcoming, `0.45` committed) | `MoleculeEffects.ts` | comet weight |
| `COMET_TAIL` / `COMET_SPEED` | `OrbitComet.ts` | comet length/speed |
| `REVEAL_DURATION` | `MoleculeEffects.ts` | draw-in cadence (matches `--line-draw-duration`) |

Keep the field understated relative to the captions. There is intentionally **no glow plane** — the
atom reads through its edge rim and one drafting shell.

## Verification

- `npm run build` (SSG: 288 routes) is the project's compile check.
- Runtime check via headless Chrome + CDP: read `gl.getError()` and listen for
  `Runtime.exceptionThrown` / console errors — the build cannot catch a GLSL compile failure.
- Manual browser pass at `?quality=high|medium|low`, home (+ hover / autoplay-next), `/about` and
  `/portfolio`, top and mid-scroll. There is no test/lint/typecheck script in this project; FPS was
  not measured.
