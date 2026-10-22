import type { Group, Scene } from 'three';
import type { Atom } from '../Atom';
import type { GeometryCache } from '../resources/GeometryCache';
import type { QualitySettings } from '../quality/types';
import { AtomField } from './AtomField';
import { AtomRim } from './AtomRim';
import { OrbitComet } from './OrbitComet';
import { ParticleMist } from './ParticleMist';
import type { EffectsFrameState } from './types';

/** Matches `--line-draw-duration` — the field draws in with the listing hairlines. */
const REVEAL_DURATION = 1.25;
const FADE_FOLLOW = 4.2;
const PULSE_DECAY = 2.6;
/**
 * Phase-lock the dust emission to the active-atom cycle: a new upcoming atom
 * re-emits the stream from the hub, exactly like the comet is reborn at the
 * atom. Individual points then keep their own randomized loops.
 */
const STREAM_ORIGIN_TIME = 0;

/**
 * Orchestrates the atmosphere layer. Owned by `MoleculeScene`; all effects are
 * additive geometry already in the scene graph, so quality changes never
 * rebuild the molecule and route changes never mount a second renderer.
 */
export class MoleculeEffects {
  private readonly mist: ParticleMist;
  private readonly field: AtomField;
  private readonly comet: OrbitComet;
  private readonly rims = new Map<string, AtomRim>();
  private readonly atomsById = new Map<string, Atom>();
  private readonly moleculeGroup: Group;
  private readonly cache: GeometryCache;
  private atoms: readonly Atom[] = [];
  private settings: QualitySettings;
  private fade = 0;
  private pulse = 0;
  private revealElapsed = 0;
  private lastFocusAtomId: string | null = null;
  /** Hover / autoplay-next atom — the dust bond and comet point here. */
  private upcomingAtomId: string | null = null;
  /** Orbit currently carrying the comet. */
  private cometAtomId: string | null = null;
  /** Set when the upcoming target changed — next frame refreshes bond anchors. */
  private linkDirty = false;
  /** Local clock restarted whenever the stream is re-emitted. */
  private streamTime = 0;
  /** Bond endpoint cached at the last settle; streams read it every frame. */
  private readonly linkFrom: [number, number, number] = [0, 0, 0];
  private readonly linkTo: [number, number, number] = [0, 0, 0];
  private linkReady = false;

  constructor(
    scene: Scene,
    moleculeGroup: Group,
    cache: GeometryCache,
    settings: QualitySettings,
  ) {
    this.moleculeGroup = moleculeGroup;
    this.cache = cache;
    this.settings = settings;

    this.mist = new ParticleMist();
    this.mist.setCount(settings.particleCount);
    this.mist.setDrift(settings.dustDrift);
    this.mist.setFog(scene.fog);
    scene.add(this.mist.object);

    this.field = new AtomField(cache, settings);
    this.comet = new OrbitComet(cache, moleculeGroup, settings);
  }

  /** Rebuild per-atom rims after `MoleculeScene.buildMolecule`. */
  syncAtoms(atoms: readonly Atom[]): void {
    this.clearAtoms();
    this.atoms = atoms;
    for (const atom of atoms) {
      this.atomsById.set(atom.id, atom);
      this.rims.set(
        atom.id,
        new AtomRim(
          atom,
          this.cache.getUnitIcosahedron(this.settings.atomDetail),
          this.settings.atomRim,
        ),
      );
    }
    this.lastFocusAtomId = null;
    this.linkReady = false;
    this.applyQuality(this.settings);
  }

  /**
   * Dust target (hover / autoplay-next). A peripheral atom gets the hub→atom
   * bond stream; the hub itself gets the shell dive, because it owns no bond
   * and no orbit. One entry point keeps the comet birth and the dust
   * re-emission on the same frame.
   */
  setTarget(atomId: string | null, orbitAtomId: string | null): void {
    const targetChanged = this.upcomingAtomId !== atomId;
    this.upcomingAtomId = atomId;

    const cometBorn = this.comet.setTarget(
      orbitAtomId,
      orbitAtomId !== null && orbitAtomId === atomId ? 1 : 0.45,
    );
    this.cometAtomId = orbitAtomId;

    if (!targetChanged && !cometBorn) return;

    // Fresh cycle: the stream is destroyed at the hub and drawn again, so it
    // never appears mid-trajectory as if the previous run had paused.
    this.streamTime = STREAM_ORIGIN_TIME;
    this.linkReady = false;
    this.linkDirty = true;
    this.mist.restartStream();
  }

  /** @deprecated Use `setTarget` — kept for scene-level call sites. */
  setActiveOrbitAtom(atomId: string | null): void {
    this.setTarget(
      this.upcomingAtomId ?? atomId,
      atomId,
    );
  }

  /** @deprecated Use `setTarget`. */
  setUpcomingAtom(atomId: string | null): void {
    this.setTarget(atomId, this.cometAtomId ?? atomId);
  }

  setOrbitScale(scale: number): void {
    this.comet.setLayoutScale(scale);
  }

  /**
   * Home boot: the same comet instance flies the assembly chain, one orbit at
   * a time, under the intro clock. `null` hands it back to `setTarget`.
   */
  setBootComet(
    atomId: string | null,
    head: number,
    progress: number,
    opacity: number,
  ): void {
    this.comet.setBootArc(atomId, head, progress, opacity);
  }

  applyQuality(settings: QualitySettings): void {
    this.settings = settings;
    this.mist.setCount(settings.particleCount);
    this.mist.setDrift(settings.dustDrift);
    this.field.applyQuality(settings);
    this.comet.applyQuality(settings);

    const geometry = this.cache.getUnitIcosahedron(settings.atomDetail);
    for (const rim of this.rims.values()) {
      rim.applyQuality(geometry, settings.atomRim);
    }
  }

  resize(width: number, height: number, pixelRatio: number): void {
    void width;
    void height;
    this.mist.resize(pixelRatio);
  }

  update(delta: number, elapsed: number, state: EffectsFrameState): void {
    const fadeT = 1 - Math.exp(-FADE_FOLLOW * delta);
    const targetFade = state.approachBusy ? 0 : 1;
    this.fade += (targetFade - this.fade) * fadeT;
    // Home boot: the field / rims fade in with the assembly; the ambient dust
    // has its own spawn clock (`introDust`) and ignores that gate, because it
    // is born at the hub centre rather than fading in place.
    const fade = this.fade * state.introReveal;

    if (state.approachBusy) {
      this.revealElapsed = 0;
    } else {
      this.revealElapsed = Math.min(
        REVEAL_DURATION,
        this.revealElapsed + delta,
      );
    }
    const reveal = state.reducedMotion
      ? 1
      : this.revealElapsed / REVEAL_DURATION;

    const focusedChanged = state.focusedAtomId !== this.lastFocusAtomId;
    if (focusedChanged) {
      if (
        this.lastFocusAtomId !== null &&
        state.home &&
        this.fade > 0.12
      ) {
        this.pulse = 1;
      }
      this.lastFocusAtomId = state.focusedAtomId;
      this.field.setAtom(
        state.focusedAtomId
          ? this.atomsById.get(state.focusedAtomId) ?? null
          : null,
      );
    }
    this.pulse *= Math.exp(-PULSE_DECAY * delta);

    if (this.atoms.length === 0) {
      return;
    }

    // Anchors only need a refresh when the upcoming target or the pose changed.
    this.syncDustLink(state, focusedChanged || this.linkDirty);
    this.linkDirty = false;
    this.syncDustTransform();

    const time = state.reducedMotion ? 0 : elapsed;
    this.streamTime += delta;

    this.mist.update(
      state.reducedMotion ? 0 : this.streamTime,
      time,
      this.fade,
      state.introDust,
    );

    this.field.update(time, state, fade, this.pulse, reveal);

    this.comet.update(delta, fade, state.reducedMotion);

    for (const atom of this.atoms) {
      const rim = this.rims.get(atom.id);
      if (!rim) continue;
      // The focused atom carries captions over its silhouette: a fresnel edge
      // there reads like an MMO selection ring, so only peripheral atoms get
      // a faint rim. Frozen routes also drop it (planet-sized atom).
      const focused = atom.id === state.focusedAtomId;
      const intensity = state.frozen || focused ? 0 : 0.16;
      rim.setRadius(atom.radius);
      rim.setIntensity(fade * intensity * (0.75 + 0.25 * reveal));
    }
  }

  dispose(): void {
    this.clearAtoms();
    this.mist.object.removeFromParent();
    this.mist.dispose();
    this.field.dispose();
    this.comet.dispose();
  }

  /** Detach rims/shells before the owning atoms are disposed. */
  clearAtoms(): void {
    for (const rim of this.rims.values()) {
      rim.dispose();
    }
    this.rims.clear();
    this.atomsById.clear();
    this.atoms = [];
    this.field.setAtom(null);
    this.lastFocusAtomId = null;
    this.linkReady = false;
  }

  /**
   * Dust trajectory for the upcoming atom (hover / autoplay-next).
   *
   * - Peripheral target: stream runs along the hub → atom bond, while the dive
   *   rows copy the hub dive onto that atom (particles converge on its shell).
   *   Bond anchors are pose data, recomputed only when the target atom changed.
   * - Hub target: there is no hub → hub bond and no orbit placement for the
   *   hub, so the same rows dive in from the shell around it. Centre and radii
   *   are written every frame because the compact layout resizes the hub.
   */
  private syncDustLink(state: EffectsFrameState, targetChanged: boolean): void {
    // The bond stream belongs to the live home field. `setActive` only dims it
    // to an idle residue, so a frozen route needs the hard gate or the last
    // target's stream keeps flying at a stale atom.
    this.mist.setStreamEnabled(state.home);
    const hub = this.atomsById.get('C');
    const target = this.upcomingAtomId
      ? this.atomsById.get(this.upcomingAtomId)
      : undefined;
    if (!hub || !target) {
      this.mist.setLink(this.linkFrom, this.linkTo, false);
      this.mist.setAtomDive(null, 0, false);
      return;
    }

    const active = state.home && !state.frozen && !state.approachBusy;

    if (target === hub) {
      this.mist.setFall(hub.object.position, hub.radius, active);
      // The stream rows already dive onto the hub — no second dive there.
      this.mist.setAtomDive(null, 0, false);
      this.linkReady = false;
      return;
    }

    if (active && (targetChanged || !this.linkReady)) {
      writeInset(
        hub.object.position,
        target.object.position,
        hub.radius,
        target.radius,
        this.linkFrom,
        this.linkTo,
      );
      this.linkReady = true;
    }
    if (!active) this.linkReady = false;
    this.mist.setLink(this.linkFrom, this.linkTo, active);
    // Same dive as the central atom, landed on the atom the user will reach:
    // it rides the bond stream's clock, so both arrive on the same frame.
    this.mist.setAtomDive(target.object.position, target.radius, active);
  }

  /** Dust rides the molecule frame so bond anchors stay valid while it spins. */
  private syncDustTransform(): void {
    const dust = this.mist.object;
    dust.position.copy(this.moleculeGroup.position);
    dust.quaternion.copy(this.moleculeGroup.quaternion);
    dust.updateMatrixWorld(true);
  }
}

function writeInset(
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  fromRadius: number,
  toRadius: number,
  outFrom: [number, number, number],
  outTo: [number, number, number],
): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dy, dz);
  if (length < 1e-6) return;
  const nx = dx / length;
  const ny = dy / length;
  const nz = dz / length;
  const insetStart = Math.min(fromRadius * 0.92, length * 0.4);
  const insetEnd = Math.min(toRadius * 0.92, length * 0.4);
  outFrom[0] = from.x + nx * insetStart;
  outFrom[1] = from.y + ny * insetStart;
  outFrom[2] = from.z + nz * insetStart;
  outTo[0] = to.x - nx * insetEnd;
  outTo[1] = to.y - ny * insetEnd;
  outTo[2] = to.z - nz * insetEnd;
}
