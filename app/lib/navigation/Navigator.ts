import gsap from 'gsap';
import { prefersReducedMotion } from '../a11y/reducedMotion';
import { CENTER_FRAMING } from '../molecular/composition/profiles';
import type { MoleculeController } from '../molecular/MoleculeController';
import { getItemByAtomId } from './navigationConfig';
import type { NavigationState } from './NavigationState';
import { acquireRouteVeil, releaseRouteVeil } from './routeVeil';
import { TransitionState } from './TransitionState';

export type NavigateListener = (atomId: string) => void;

export type NavigatorOptions = {
  controller: MoleculeController;
  navigationState: NavigationState;
  /**
   * Host for DestinationView (legacy). The veil itself is parented to
   * `document.body` via `acquireRouteVeil` so it can survive hero unmount.
   */
  overlayParent?: HTMLElement;
  /**
   * Called at the timeline "navigate" label (forward only).
   * Replace later with Nuxt `navigateTo(item.route)` or any router.
   */
  onNavigate?: NavigateListener;
};

/** Proxy values GSAP tweens; synced into controller + overlay + TransitionState. */
type TransitionProxy = {
  zoom: number;
  fill: number;
  overlay: number;
  screenX: number;
  screenY: number;
  approach: number;
  /** Hero approach: full orbit revolution (0→1 = 0→2π). */
  orbitSweep: number;
};

const FOCUS_DURATION = 0.45;
/** Single pull-in: zoom + fill run together (was sequential ≈1.4s). */
const APPROACH_DURATION = 1.05;
const OVERLAY_DURATION = 0.45;
/** Off-home atom change: leave the old approach pose. */
const RETARGET_PULLBACK_DURATION = 0.45;
/** Off-home atom change: focus settle before re-approach. */
const RETARGET_FOCUS_DURATION = 0.6;
/** Off-home atom change: re-approach the new atom. */
const RETARGET_APPROACH_DURATION = 0.7;

/**
 * Page-transition coordinator: owns the GSAP timeline and `TransitionState`.
 * Scene verbs stay on `MoleculeController`; no route / history logic here.
 */
export class Navigator {
  readonly transitionState = new TransitionState();

  private readonly controller: MoleculeController;
  private readonly navigationState: NavigationState;
  private readonly overlay: ReturnType<typeof acquireRouteVeil>;
  private readonly navigateListeners = new Set<NavigateListener>();

  private timeline: gsap.core.Timeline | null = null;
  private proxy: TransitionProxy = {
    zoom: 0,
    fill: 0,
    overlay: 0,
    screenX: 0.5,
    screenY: 0.5,
    approach: 0,
    orbitSweep: 0,
  };
  /** Atom id for which `onNavigate` already fired on this forward run. */
  private navigatedAtomId: string | null = null;

  constructor(options: NavigatorOptions) {
    this.controller = options.controller;
    this.navigationState = options.navigationState;
    this.overlay = acquireRouteVeil();
    if (options.onNavigate) {
      this.navigateListeners.add(options.onNavigate);
    }
  }

  get busy(): boolean {
    return this.transitionState.busy;
  }

  /**
   * True while a forward timeline still owns this atom's approach.
   * Spatial must not `completeHandoff` in that case.
   */
  isLiveApproach(atomId: string | null): boolean {
    if (!atomId || this.transitionState.atomId !== atomId) return false;
    if (!this.transitionState.busy) return false;
    if (this.timeline?.reversed()) return false;
    return true;
  }

  get overlayRoot(): HTMLElement {
    return this.overlay.root;
  }

  /**
   * Start or retarget the focus → zoom → fill timeline, then navigate.
   * No veil: the canvas persists, so the approach pose is the destination.
   */
  navigateTo(atomId: string): void {
    if (!this.controller.scene.getAtom(atomId)) return;

    const item = getItemByAtomId(atomId);
    this.controller.freeze();
    this.transitionState.patch({ busy: true });
    this.navigationState.setCommitted(item?.id ?? null);

    if (prefersReducedMotion()) {
      this.killTimeline();
      this.controller.setCompositionFramingOverride(CENTER_FRAMING);
      this.controller.holdApproach({ immediate: true });
      this.overlay.setOpacity(0);
      this.transitionState.patch({
        atomId,
        busy: false,
        phase: 'idle',
        zoom: 1,
        fill: 1,
        overlay: 0,
        progress: 1,
      });
      this.controller.setTransitionDriven(false);
      this.emitNavigate(atomId);
      return;
    }

    // Already heading to this atom on a forward timeline — keep it.
    if (
      this.transitionState.atomId === atomId &&
      this.timeline &&
      this.timeline.isActive() &&
      !this.timeline.reversed()
    ) {
      return;
    }

    const atomChanged = this.controller.getFocusedAtomId() !== atomId;
    const framing = this.controller.getActiveCompositionFraming();

    // Capture live visuals before killing the previous tween (no hard reset).
    this.proxy = {
      zoom: this.controller.zoomProgress,
      fill: this.controller.fillProgress,
      overlay: this.overlay.getOpacity(),
      screenX: framing.screenX,
      screenY: framing.screenY,
      approach: framing.approach,
      orbitSweep: 0,
    };

    this.killTimeline();
    // New atom ⇒ allow onNavigate again; same atom retarget keeps the flag.
    if (atomChanged) {
      this.navigatedAtomId = null;
    }

    this.controller.setTransitionDriven(true);
    this.controller.prepareTransitionTarget(atomId);

    this.transitionState.patch({
      atomId,
      busy: true,
      phase: 'focus',
      zoom: this.proxy.zoom,
      fill: this.proxy.fill,
      overlay: this.proxy.overlay,
      progress: 0,
    });

    this.timeline = this.buildTimeline(atomId, this.proxy, atomChanged, {
      emitNavigate: true,
      settleOnComplete: true,
      orbitSweep: true,
    });
  }

  /**
   * Animated focus → approach without navigating.
   * Used when the route already changed and Spatial needs a pull-in from rest.
   */
  approachTo(atomId: string): void {
    if (!this.controller.scene.getAtom(atomId)) return;

    this.killTimeline();
    this.navigatedAtomId = null;
    this.overlay.setOpacity(0);
    this.controller.freeze();

    if (prefersReducedMotion()) {
      this.controller.setCompositionFramingOverride(CENTER_FRAMING);
      this.controller.focusAtom(atomId);
      this.controller.setHighlightedAtom(atomId);
      this.controller.holdApproach({ immediate: true });
      this.controller.setCompositionFramingOverride(null);
      this.controller.setTransitionDriven(false);
      this.transitionState.patch({
        atomId,
        busy: false,
        phase: 'idle',
        zoom: 1,
        fill: 1,
        overlay: 0,
        progress: 1,
      });
      return;
    }

    const framing = this.controller.getActiveCompositionFraming();
    this.proxy = {
      zoom: this.controller.zoomProgress,
      fill: this.controller.fillProgress,
      overlay: 0,
      screenX: framing.screenX,
      screenY: framing.screenY,
      approach: framing.approach,
      orbitSweep: 0,
    };

    const atomChanged = this.controller.getFocusedAtomId() !== atomId;
    this.controller.setTransitionDriven(true);
    this.controller.prepareTransitionTarget(atomId);

    this.transitionState.patch({
      atomId,
      busy: true,
      phase: 'focus',
      zoom: this.proxy.zoom,
      fill: this.proxy.fill,
      overlay: 0,
      progress: 0,
    });

    this.timeline = this.buildTimeline(atomId, this.proxy, atomChanged, {
      emitNavigate: false,
      settleOnComplete: true,
      orbitSweep: true,
    });
  }

  /**
   * Abort an in-flight timeline after a route hop to a *different* destination.
   * Same-atom live approach is not released here — Spatial skips this call.
   * Does not rewind zoom/fill or dispose the veil.
   */
  completeHandoff(): void {
    const hadTimeline = this.timeline !== null;
    this.killTimeline();
    this.navigatedAtomId = null;
    this.overlay.setOpacity(0);
    // Idle hops (leave-home from rest) must keep current framing so approachTo
    // can tween it. An aborted timeline already owns the override — drop it.
    if (hadTimeline) {
      this.controller.setCompositionFramingOverride(null);
    }
    this.controller.setTransitionDriven(false);
    this.transitionState.patch({
      busy: false,
      phase: 'idle',
    });
  }

  /**
   * Off-home hop between different framed atoms: pullback → focus → approach.
   * Does not navigate — the route already changed before SpatialController.apply.
   */
  retargetApproach(atomId: string): void {
    if (!this.controller.scene.getAtom(atomId)) return;

    this.killTimeline();
    this.navigatedAtomId = null;
    this.overlay.setOpacity(0);
    this.controller.freeze();

    if (prefersReducedMotion()) {
      this.controller.setCompositionFramingOverride(null);
      this.controller.focusAtom(atomId);
      this.controller.setHighlightedAtom(atomId);
      this.controller.holdApproach({ immediate: true });
      this.controller.setTransitionDriven(false);
      this.transitionState.patch({
        atomId,
        busy: false,
        phase: 'idle',
        zoom: 1,
        fill: 1,
        overlay: 0,
        progress: 1,
      });
      return;
    }

    const framing = this.controller.getActiveCompositionFraming();
    const from: TransitionProxy = {
      zoom: this.controller.zoomProgress,
      fill: this.controller.fillProgress,
      overlay: 0,
      screenX: framing.screenX,
      screenY: framing.screenY,
      approach: framing.approach,
      orbitSweep: 0,
    };
    this.proxy = { ...from };
    const proxy = this.proxy;

    // Pullback: ease rest framing to screen center while zoom/fill unwind.
    this.controller.setTransitionDriven(true);
    this.transitionState.patch({
      atomId,
      busy: true,
      phase: 'overlay',
      zoom: from.zoom,
      fill: from.fill,
      overlay: 0,
      progress: 0,
    });

    const pullGap = Math.max(from.zoom, from.fill);
    const pullDur = RETARGET_PULLBACK_DURATION * Math.max(pullGap, 0.001);

    const tl = gsap.timeline({
      onUpdate: () => {
        this.controller.setZoomProgress(proxy.zoom);
        this.controller.setFillProgress(proxy.fill);
        this.controller.setCompositionFramingOverride({
          screenX: proxy.screenX,
          screenY: proxy.screenY,
          approach: proxy.approach,
        });
        this.transitionState.patch({
          atomId,
          progress: tl.progress(),
          zoom: proxy.zoom,
          fill: proxy.fill,
          overlay: 0,
          busy: true,
        });
      },
      onComplete: () => {
        // No holdApproach({ immediate }) — that refocus+snap causes a late twist jerk.
        this.controller.settleApproachProgress();
        this.controller.setCompositionFramingOverride(null);
        this.controller.setTransitionDriven(false);
        this.timeline = null;
        this.transitionState.patch({
          atomId,
          busy: false,
          phase: 'idle',
          zoom: 1,
          fill: 1,
          overlay: 0,
          progress: 1,
        });
      },
    });

    // 1. Pull back from the old atom toward screen-centered rest.
    tl.addLabel('pullback', 0);
    tl.call(
      () => {
        this.transitionState.patch({ phase: 'overlay', atomId });
      },
      [],
      'pullback',
    );
    if (pullGap > 0.001) {
      tl.to(
        proxy,
        {
          zoom: 0,
          fill: 0,
          screenX: CENTER_FRAMING.screenX,
          screenY: CENTER_FRAMING.screenY,
          approach: CENTER_FRAMING.approach,
          duration: pullDur,
          ease: 'power2.inOut',
        },
        'pullback',
      );
    } else {
      proxy.screenX = CENTER_FRAMING.screenX;
      proxy.screenY = CENTER_FRAMING.screenY;
      proxy.approach = CENTER_FRAMING.approach;
      this.controller.setCompositionFramingOverride(CENTER_FRAMING);
    }

    // 2. Face the new atom (wait for focus slerp), then re-approach.
    tl.addLabel('focus');
    tl.call(
      () => {
        this.transitionState.patch({ phase: 'focus', atomId });
        this.controller.focusAtom(atomId);
        this.controller.setHighlightedAtom(atomId);
        this.controller.prepareTransitionTarget(atomId);
      },
      [],
      'focus',
    );
    tl.to({}, { duration: RETARGET_FOCUS_DURATION }, 'focus');

    tl.addLabel('approach');
    tl.call(
      () => {
        this.transitionState.patch({ phase: 'approach', atomId });
        // Keep zoom atom id; prepareTransitionTarget no-ops focus when already set.
        this.controller.prepareTransitionTarget(atomId);
      },
      [],
      'approach',
    );
    tl.to(
      proxy,
      {
        zoom: 1,
        fill: 1,
        duration: RETARGET_APPROACH_DURATION,
        ease: 'power2.inOut',
      },
      'approach',
    );

    this.timeline = tl;
  }

  /**
   * Abort the current transition and ease back to rest.
   * Builds a fresh unwind timeline from live visuals (safe after retargets).
   */
  cancel(): void {
    this.controller.setCompositionFramingOverride(null);
    this.navigationState.setCommitted('home');
    this.navigatedAtomId = null;
    this.controller.unfreeze();

    const framing = this.controller.getActiveCompositionFraming();
    const from: TransitionProxy = {
      zoom: this.controller.zoomProgress,
      fill: this.controller.fillProgress,
      overlay: this.overlay.getOpacity(),
      screenX: framing.screenX,
      screenY: framing.screenY,
      approach: framing.approach,
      orbitSweep: 0,
    };

    this.killTimeline();

    if (from.zoom < 0.001 && from.fill < 0.001 && from.overlay < 0.001) {
      this.softResetScene();
      this.transitionState.resetVisuals();
      this.controller.setTransitionDriven(false);
      return;
    }

    this.controller.setTransitionDriven(true);
    this.proxy = { ...from };
    this.transitionState.patch({
      busy: true,
      phase: 'overlay',
      zoom: from.zoom,
      fill: from.fill,
      overlay: from.overlay,
    });

    const proxy = this.proxy;
    const tl = gsap.timeline({
      onUpdate: () => {
        this.controller.setZoomProgress(proxy.zoom);
        this.controller.setFillProgress(proxy.fill);
        this.overlay.setOpacity(proxy.overlay);
        this.transitionState.patch({
          progress: 1 - tl.progress(),
          zoom: proxy.zoom,
          fill: proxy.fill,
          overlay: proxy.overlay,
          busy: true,
        });
      },
      onComplete: () => {
        this.softResetScene();
        this.transitionState.resetVisuals();
        this.controller.setTransitionDriven(false);
        this.timeline = null;
      },
    });

    // Unwind: veil first, then one approach rewind (zoom+fill together).
    if (from.overlay > 0.001) {
      tl.to(proxy, {
        overlay: 0,
        duration: OVERLAY_DURATION * from.overlay,
        ease: 'power1.out',
      });
    }
    const unwindGap = Math.max(from.zoom, from.fill);
    if (unwindGap > 0.001) {
      tl.to(
        proxy,
        {
          zoom: 0,
          fill: 0,
          duration: APPROACH_DURATION * unwindGap,
          ease: 'power2.inOut',
        },
        from.overlay > 0.001 ? '-=0.1' : 0,
      );
    }
    tl.call(() => {
      this.controller.restoreOverview();
    });

    this.timeline = tl;
  }

  /** Subscribe to the navigate cue (forward pass only). Returns unsubscribe. */
  onNavigate(listener: NavigateListener): () => void {
    this.navigateListeners.add(listener);
    return () => {
      this.navigateListeners.delete(listener);
    };
  }

  dispose(): void {
    this.killTimeline();
    this.navigateListeners.clear();
    releaseRouteVeil();
    this.controller.setTransitionDriven(false);
  }

  private buildTimeline(
    atomId: string,
    from: TransitionProxy,
    atomChanged: boolean,
    options: {
      emitNavigate: boolean;
      settleOnComplete: boolean;
      orbitSweep?: boolean;
    },
  ): gsap.core.Timeline {
    const proxy: TransitionProxy = { ...from };
    this.proxy = proxy;

    // Scale remaining work from current visuals so retargets do not rewind.
    const alreadyOnTarget =
      !atomChanged &&
      this.controller.getFocusedAtomId() === atomId &&
      this.controller.isFocusSettled();
    // Leave-home (orbit sweep): no focus-only beat — facing + zoom + 2π start together.
    // Two-step atom click already has focus settled (`alreadyOnTarget` → 0).
    const focusDur =
      options.orbitSweep !== false || alreadyOnTarget
        ? 0
        : atomChanged
          ? FOCUS_DURATION
          : FOCUS_DURATION * 0.25;
    const approachGap = Math.max(1 - from.zoom, 1 - from.fill);
    const framingGap = Math.max(
      Math.abs(from.screenX - CENTER_FRAMING.screenX),
      Math.abs(from.screenY - CENTER_FRAMING.screenY),
      Math.abs(from.approach - CENTER_FRAMING.approach),
    );
    const needsZoom = approachGap > 0.02;
    const needsFraming = framingGap > 0.001;
    const needsOrbit = options.orbitSweep !== false;
    // Dolly always gets a full second when it still has work — do not scale it
    // down with framing leftover, and do not share an inOut ease with orbit.
    const zoomDur = needsZoom ? APPROACH_DURATION : 0;
    const orbitDur = needsOrbit ? APPROACH_DURATION : 0;
    const framingDur = needsFraming
      ? Math.max(zoomDur, APPROACH_DURATION * 0.65)
      : 0;

    const tl = gsap.timeline({
      onUpdate: () => {
        this.syncOutputs(atomId, proxy, tl.progress());
      },
      onComplete: () => {
        if (options.settleOnComplete) {
          this.controller.settleApproachProgress();
          this.controller.setCompositionFramingOverride(null);
          this.controller.setTransitionDriven(false);
          this.timeline = null;
          this.transitionState.patch({
            atomId,
            phase: 'idle',
            progress: 1,
            busy: false,
            zoom: 1,
            fill: 1,
            overlay: 0,
          });
          return;
        }
        this.transitionState.patch({
          phase: 'complete',
          progress: 1,
          busy: true,
          zoom: proxy.zoom,
          fill: proxy.fill,
          overlay: proxy.overlay,
        });
      },
    });

    // 1. Face the atom. Leave-home skips the wait so zoom/orbit start in the same beat.
    tl.addLabel('focus', 0);
    tl.call(
      () => {
        if (tl.reversed()) return;
        this.transitionState.patch({ phase: 'focus', atomId });
        this.controller.focusAtom(atomId);
        this.controller.setHighlightedAtom(atomId);
      },
      [],
      'focus',
    );
    if (focusDur > 0.001) {
      tl.to({}, { duration: focusDur }, 'focus');
    }

    // 2. Approach — zoom + fill + framing → center + orbit sweep (hero leave)
    tl.addLabel('approach', focusDur > 0.001 ? focusDur : 0);
    tl.call(
      () => {
        if (tl.reversed()) return;
        this.transitionState.patch({ phase: 'approach' });
        this.controller.prepareTransitionTarget(atomId);
        if (options.orbitSweep !== false) {
          this.controller.beginOrbitSweep(atomId);
        }
      },
      [],
      'approach',
    );
    if (needsZoom) {
      tl.to(
        proxy,
        {
          zoom: 1,
          fill: 1,
          duration: zoomDur,
          ease: 'power1.inOut',
        },
        'approach',
      );
    }
    if (needsFraming) {
      tl.to(
        proxy,
        {
          screenX: CENTER_FRAMING.screenX,
          screenY: CENTER_FRAMING.screenY,
          approach: CENTER_FRAMING.approach,
          duration: framingDur,
          ease: 'power2.inOut',
        },
        'approach',
      );
    }
    if (needsOrbit) {
      tl.to(
        proxy,
        {
          orbitSweep: 1,
          duration: orbitDur,
          ease: 'none',
        },
        'approach',
      );
    }

    if (options.emitNavigate) {
      // Navigate once the atom is in the approach pose — no veil / fade.
      tl.addLabel('navigate');
      tl.call(
        () => {
          if (tl.reversed()) return;
          this.emitNavigate(atomId);
        },
        [],
        'navigate',
      );
    }

    return tl;
  }

  private syncOutputs(
    atomId: string,
    proxy: TransitionProxy,
    progress: number,
  ): void {
    this.controller.setZoomProgress(proxy.zoom);
    this.controller.setFillProgress(proxy.fill);
    this.controller.setCompositionFramingOverride({
      screenX: proxy.screenX,
      screenY: proxy.screenY,
      approach: proxy.approach,
    });
    this.controller.setOrbitSweepProgress(proxy.orbitSweep);
    this.overlay.setOpacity(proxy.overlay);

    this.transitionState.patch({
      atomId,
      progress,
      zoom: proxy.zoom,
      fill: proxy.fill,
      overlay: proxy.overlay,
      busy: true,
    });
  }

  private emitNavigate(atomId: string): void {
    if (this.navigatedAtomId === atomId) return;
    this.navigatedAtomId = atomId;
    for (const listener of this.navigateListeners) {
      listener(atomId);
    }
  }

  private softResetScene(): void {
    this.controller.setZoomProgress(0);
    this.controller.setFillProgress(0);
    this.controller.clearZoom();
    this.controller.restoreOverview();
    this.controller.unfreeze();
    this.overlay.setOpacity(0);
    this.navigatedAtomId = null;
  }

  private killTimeline(): void {
    if (!this.timeline) return;
    this.timeline.kill();
    this.timeline = null;
    this.controller.finishOrbitSweep();
  }
}
