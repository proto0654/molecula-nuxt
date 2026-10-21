import gsap from 'gsap';
import type { MoleculeController } from '../molecular/MoleculeController';
import type { MoleculeIntroReveal } from '../molecular/MoleculeScene';
import {
  COMPOSITION_PROFILES,
  HOME_DESKTOP_FRAMING,
  type ViewportMode,
} from '../molecular/composition/profiles';
import { moleculeConfig } from '../molecular/moleculeConfig';
import { ATOM_ORBIT_PLACEMENT, PERIPHERAL_ATOM_IDS } from '../molecular/moleculeOrbits';
import { hubAtomId } from '../spatial/spatialAtoms';

/**
 * Home boot: the molecule condenses at screen centre, then drifts into the
 * desktop stage bias while the HUD draws in. Direct load of `/` only - an
 * in-app return to home keeps the existing return animation.
 *
 * The assembly reads like a gyroscope coming up to speed: rings tumble out of
 * an edge-on line, dust spirals out of the hub, and a single comet runs the
 * orbits one at a time - each atom appears where the comet reaches it, on a
 * connector that was drawn just ahead of the head.
 *
 * One clock drives Three.js values and the CSS phase classes, so the canvas
 * and the chrome can never drift apart. `HeroIntro` owns no DOM besides the
 * two phase classes on `.molecular-chrome`.
 */

/** Desktop beat sheet (ms from the first rendered frame). */
const BEATS = {
  hubAt: 60,
  hubDuration: 500,
  /** Rings start tumbling edge-on; neighbouring starts overlap. */
  orbitAt: 420,
  orbitGap: 70,
  orbitDuration: 700,
  /** Ambient dust leaves the hub centre while the rings are still unfolding. */
  dustAt: 700,
  dustDuration: 1450,
  /** One comet leg per peripheral atom: a half lap that ends on the atom. */
  cometAt: 1160,
  cometLeg: 320,
  /** Connector draws ahead of the head, so the atom lands on a finished bond. */
  bondLead: 300,
  bondDuration: 240,
  atomDuration: 380,
  /** Text layer: atom labels + tag cloud, once two atoms are in. */
  textAt: 1850,
  textDuration: 340,
  /** Atmosphere (drafting field + rims) arrives with the last legs. */
  airAt: 2200,
  airDuration: 450,
  /** Welding pass from the existing light language, once the chain is complete. */
  sweepAt: 2500,
  /** Desktop stage bias: only once every atom is drawn, and a short push. */
  driftAt: 2820,
  driftDuration: 560,
  /** Chrome beats (CSS rides these classes, not timers of its own). */
  uiAt: 1500,
  liveAt: 3440,
} as const;

/** Tablet / mobile have less chrome to draw, so the whole boot runs tighter. */
const COMPACT_TIME_SCALE = 0.86;

/** Assembling constellation starts this much yaw away from its rest pose. */
const INTRO_YAW = -0.34;

/** Last-resort reveal if the first rendered frame never arrives (WebGL failure). */
const START_GUARD_MS = 1600;

type MutableReveal = {
  atoms: Record<string, number>;
  bonds: Record<string, number>;
  orbits: number[];
  text: number;
  dust: number;
  air: number;
};

type Framing = { screenX: number; screenY: number; approach: number };

export type HeroIntroOptions = {
  controller: MoleculeController;
  /** `.molecular-chrome` host: receives `is-boot` / `is-boot-ui`. */
  chromeRoot: HTMLElement;
  mode: ViewportMode;
  /** Boot handed control back: start autoplay, connector, settled HUD. */
  onLive: () => void;
};

export class HeroIntro {
  private readonly controller: MoleculeController;
  private readonly chromeRoot: HTMLElement;
  private readonly onLive: () => void;
  private readonly timeScale: number;
  private readonly hubId: string;
  /** Comet chain order - one leg per peripheral atom. */
  private readonly peripheralIds: readonly string[];
  private readonly reveal: MutableReveal = {
    atoms: {},
    bonds: {},
    orbits: [],
    text: 0,
    dust: 0,
    air: 0,
  };
  private readonly clock = { t: 0 };
  private readonly framingFrom: Framing;
  private readonly framingTo: Framing;

  private timeline: gsap.core.Timeline | null = null;
  private detachSkip: (() => void) | null = null;
  private guardId = 0;
  private started = false;
  private live = false;
  private uiPhase = false;
  private sweepFired = false;

  constructor(options: HeroIntroOptions) {
    this.controller = options.controller;
    this.chromeRoot = options.chromeRoot;
    this.onLive = options.onLive;
    this.timeScale = options.mode === 'desktop' ? 1 : COMPACT_TIME_SCALE;

    const hubId = hubAtomId();
    this.hubId = hubId;
    this.peripheralIds = PERIPHERAL_ATOM_IDS;
    for (const atom of moleculeConfig.atoms) {
      this.reveal.atoms[atom.id] = 0;
    }
    this.reveal.atoms[hubId] = 0;
    for (let i = 0; i < PERIPHERAL_ATOM_IDS.length; i += 1) {
      this.reveal.orbits.push(0);
    }
    for (const bond of moleculeConfig.bonds) {
      this.reveal.bonds[bond.to] = 0;
    }

    this.framingFrom = resolveStartFraming(options.mode);
    this.framingTo = resolveEndFraming(options.mode);

    // First painted frame is already centred and empty - no HUD flash.
    this.chromeRoot.classList.add('is-boot');
    this.controller.setIntroReveal(this.reveal);
    this.controller.setIntroYaw(INTRO_YAW);
    this.controller.setCompositionFramingOverride(this.framingFrom);

    this.guardId = window.setTimeout(() => this.finish(), START_GUARD_MS);
    this.detachSkip = attachSkip(() => this.requestSkip());
  }

  /** True until the boot hands control back to autoplay / navigation. */
  get active(): boolean {
    return !this.live;
  }

  /** Start the clock on the first rendered frame, not on mount. */
  startOnFirstFrame(): void {
    if (this.started || this.live) return;
    const stop = this.controller.onAfterUpdate(() => {
      stop();
      this.start();
    });
  }

  finish(): void {
    if (this.live) return;
    this.teardown();
    this.onLive();
  }

  dispose(): void {
    this.teardown();
  }

  /** Release the clock, listeners and phase classes; leave the molecule settled. */
  private teardown(): void {
    this.live = true;
    window.clearTimeout(this.guardId);
    this.guardId = 0;
    this.detachSkip?.();
    this.detachSkip = null;
    this.timeline?.kill();
    this.timeline = null;
    this.chromeRoot.classList.remove('is-boot', 'is-boot-ui');
    this.controller.setIntroComet(null);
    this.controller.setIntroYaw(0);
    this.controller.setIntroReveal(null);
  }

  private start(): void {
    if (this.started || this.live) return;
    this.started = true;
    window.clearTimeout(this.guardId);
    this.guardId = 0;

    const total = (BEATS.liveAt * this.timeScale) / 1000;
    this.timeline = gsap.timeline({
      onUpdate: () => this.apply(),
      onComplete: () => this.finish(),
    });
    this.timeline.to(
      this.clock,
      { t: total, duration: total, ease: 'none' },
      0,
    );
  }

  /** Skip affordance: first pointer / key input fast-forwards the boot. */
  private requestSkip(): void {
    if (this.live) return;
    if (!this.started) {
      this.finish();
      return;
    }
    this.timeline?.timeScale(6);
  }

  private beat(ms: number): number {
    return (ms * this.timeScale) / 1000;
  }

  private apply(): void {
    if (this.live) return;
    const t = this.clock.t;
    const { reveal } = this;

    reveal.atoms[this.hubId] = easeBackOut(
      clamp01((t - this.beat(BEATS.hubAt)) / this.beat(BEATS.hubDuration)),
    );

    for (let i = 0; i < this.peripheralIds.length; i += 1) {
      const id = this.peripheralIds[i]!;
      // The comet lands on this atom at the end of its leg; the connector is
      // drawn just ahead of it, so the atom appears on a finished bond.
      const arrival =
        this.beat(BEATS.cometAt) + (i + 1) * this.beat(BEATS.cometLeg);
      reveal.bonds[id] = easeOutCubic(
        clamp01(
          (t - arrival + this.beat(BEATS.bondLead)) /
            this.beat(BEATS.bondDuration),
        ),
      );
      reveal.atoms[id] = easeBackOut(
        clamp01((t - arrival) / this.beat(BEATS.atomDuration)),
      );
      reveal.orbits[i] = easeInOutCubic(
        clamp01(
          (t - this.beat(BEATS.orbitAt) - i * this.beat(BEATS.orbitGap)) /
            this.beat(BEATS.orbitDuration),
        ),
      );
    }

    reveal.text = easeOutCubic(
      clamp01((t - this.beat(BEATS.textAt)) / this.beat(BEATS.textDuration)),
    );
    reveal.dust = clamp01(
      (t - this.beat(BEATS.dustAt)) / this.beat(BEATS.dustDuration),
    );
    reveal.air = easeOutCubic(
      clamp01((t - this.beat(BEATS.airAt)) / this.beat(BEATS.airDuration)),
    );

    this.applyComet(t);

    const drift = easeInOutCubic(
      clamp01(
        (t - this.beat(BEATS.driftAt)) / this.beat(BEATS.driftDuration),
      ),
    );
    this.controller.setCompositionFramingOverride({
      screenX: lerp(this.framingFrom.screenX, this.framingTo.screenX, drift),
      screenY: lerp(this.framingFrom.screenY, this.framingTo.screenY, drift),
      approach: lerp(this.framingFrom.approach, this.framingTo.approach, drift),
    });
    this.controller.setIntroYaw(INTRO_YAW * (1 - drift));

    if (!this.sweepFired && t >= this.beat(BEATS.sweepAt)) {
      this.sweepFired = true;
      this.controller.playHomeBootSweep();
    }

    if (!this.uiPhase && t >= this.beat(BEATS.uiAt)) {
      this.uiPhase = true;
      this.chromeRoot.classList.add('is-boot-ui');
    }

    if (t >= this.beat(BEATS.liveAt)) {
      this.finish();
    }
  }

  /**
   * One comet, one leg at a time: it starts on the far side of a ring and
   * lands on that atom, then jumps to the next ring. The arrival is the atom's
   * own orbital angle, so the flash and the head coincide.
   */
  private applyComet(t: number): void {
    const legTime = (t - this.beat(BEATS.cometAt)) / this.beat(BEATS.cometLeg);
    const leg = Math.floor(legTime);
    if (leg < 0 || leg >= this.peripheralIds.length) {
      this.controller.setIntroComet(null);
      return;
    }
    const atomId = this.peripheralIds[leg]!;
    const progress = clamp01(legTime - leg);
    const theta = ATOM_ORBIT_PLACEMENT[atomId]?.theta ?? 0;
    this.controller.setIntroComet({
      atomId,
      // Far side → the atom's angle (forward half lap), so the tail trails
      // over the path the head has already flown.
      head: theta + Math.PI + Math.PI * progress,
      progress: 0.16 + 0.55 * progress,
      // Fade in on the new ring; the jump off the finished one is masked by
      // the atom that appears at the same instant.
      opacity: Math.min(1, progress / 0.18),
    });
  }
}

/** Boot starts dead centre (desktop) and slightly behind the rest depth. */
function resolveStartFraming(mode: ViewportMode): Framing {
  const rest = COMPOSITION_PROFILES[mode];
  if (mode === 'desktop') {
    return { screenX: 0.5, screenY: 0.5, approach: -0.85 };
  }
  return { screenX: 0.5, screenY: 0.5, approach: rest.approach - 0.5 };
}

/** Desktop settles into the home stage bias; other viewports into the profile. */
function resolveEndFraming(mode: ViewportMode): Framing {
  if (mode === 'desktop') {
    return {
      screenX: HOME_DESKTOP_FRAMING.screenX,
      screenY: HOME_DESKTOP_FRAMING.screenY,
      approach: HOME_DESKTOP_FRAMING.approach,
    };
  }
  const rest = COMPOSITION_PROFILES[mode];
  return {
    screenX: rest.screenX,
    screenY: rest.screenY,
    approach: rest.approach,
  };
}

function attachSkip(onSkip: () => void): () => void {
  const handler = (): void => onSkip();
  window.addEventListener('pointerdown', handler, true);
  window.addEventListener('keydown', handler, true);
  return () => {
    window.removeEventListener('pointerdown', handler, true);
    window.removeEventListener('keydown', handler, true);
  };
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Landing overshoot: peaks ~1.08 then settles at 1. */
function easeBackOut(t: number): number {
  const s = 1.7;
  const c = s + 1;
  return 1 + c * (t - 1) ** 3 + s * (t - 1) ** 2;
}
