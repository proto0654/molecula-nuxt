import gsap from 'gsap';
import type { MoleculeController } from '../molecular/MoleculeController';
import type { MoleculeIntroReveal } from '../molecular/MoleculeScene';
import {
  COMPOSITION_PROFILES,
  HOME_DESKTOP_FRAMING,
  type ViewportMode,
} from '../molecular/composition/profiles';
import { moleculeConfig } from '../molecular/moleculeConfig';
import { hubAtomId } from '../spatial/spatialAtoms';

/**
 * Home boot: the molecule condenses at screen centre, then drifts into the
 * desktop stage bias while the HUD draws in. Direct load of `/` only - an
 * in-app return to home keeps the existing return animation.
 *
 * One clock drives Three.js values and the CSS phase classes, so the canvas
 * and the chrome can never drift apart. `HeroIntro` owns no DOM besides the
 * two phase classes on `.molecular-chrome`.
 */

/** Desktop beat sheet (ms from the first rendered frame). */
const BEATS = {
  hubAt: 60,
  hubDuration: 440,
  bondAt: 300,
  bondGap: 70,
  bondDuration: 520,
  /** Atom lands while its bond tip is still travelling - reads as condensation. */
  atomLag: 180,
  atomDuration: 520,
  ringsAt: 1050,
  ringsDuration: 450,
  /** Text layer: atom labels + tag cloud, just ahead of the chrome. */
  textAt: 1150,
  textDuration: 320,
  dustAt: 1050,
  dustDuration: 600,
  /** Welding pass from the existing light language, once the shells are solid. */
  sweepAt: 1250,
  driftAt: 1300,
  driftDuration: 950,
  /** Chrome beats (CSS rides these classes, not timers of its own). */
  uiAt: 1450,
  liveAt: 2350,
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
  rings: number;
  text: number;
  dust: number;
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
  private readonly atomIds: string[];
  private readonly reveal: MutableReveal = {
    atoms: {},
    bonds: {},
    rings: 0,
    text: 0,
    dust: 0,
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
    this.atomIds = [
      hubId,
      ...moleculeConfig.atoms
        .map((atom) => atom.id)
        .filter((id) => id !== hubId),
    ];
    for (const id of this.atomIds) {
      this.reveal.atoms[id] = 0;
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

    for (let i = 0; i < this.atomIds.length; i += 1) {
      const id = this.atomIds[i]!;
      if (i === 0) {
        reveal.atoms[id] = easeBackOut(
          clamp01((t - this.beat(BEATS.hubAt)) / this.beat(BEATS.hubDuration)),
        );
        continue;
      }
      const bondAt =
        this.beat(BEATS.bondAt) + (i - 1) * this.beat(BEATS.bondGap);
      reveal.bonds[id] = easeOutCubic(
        clamp01((t - bondAt) / this.beat(BEATS.bondDuration)),
      );
      reveal.atoms[id] = easeBackOut(
        clamp01(
          (t - bondAt - this.beat(BEATS.atomLag)) /
            this.beat(BEATS.atomDuration),
        ),
      );
    }

    reveal.rings = easeOutCubic(
      clamp01((t - this.beat(BEATS.ringsAt)) / this.beat(BEATS.ringsDuration)),
    );
    reveal.text = easeOutCubic(
      clamp01((t - this.beat(BEATS.textAt)) / this.beat(BEATS.textDuration)),
    );
    reveal.dust = easeOutCubic(
      clamp01((t - this.beat(BEATS.dustAt)) / this.beat(BEATS.dustDuration)),
    );

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
