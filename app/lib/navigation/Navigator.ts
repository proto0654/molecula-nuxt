import gsap from 'gsap';
import { prefersReducedMotion } from '../a11y/reducedMotion';
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
};

const FOCUS_DURATION = 0.45;
/** Single pull-in: zoom + fill run together (was sequential ≈1.4s). */
const APPROACH_DURATION = 1.05;
const OVERLAY_DURATION = 0.45;

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
  private proxy: TransitionProxy = { zoom: 0, fill: 0, overlay: 0 };
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
    this.navigationState.setCommitted(item?.id ?? null);
    this.controller.freeze();
    this.transitionState.patch({ busy: true });

    if (prefersReducedMotion()) {
      this.killTimeline();
      this.controller.holdApproach({ immediate: true });
      this.overlay.setOpacity(0);
      this.transitionState.patch({
        atomId,
        busy: true,
        phase: 'complete',
        zoom: 1,
        fill: 1,
        overlay: 0,
        progress: 1,
      });
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

    const atomChanged = this.transitionState.atomId !== atomId;

    // Capture live visuals before killing the previous tween (no hard reset).
    this.proxy = {
      zoom: this.controller.zoomProgress,
      fill: this.controller.fillProgress,
      overlay: this.overlay.getOpacity(),
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

    this.timeline = this.buildTimeline(atomId, this.proxy, atomChanged);
  }

  /**
   * Release the GSAP timeline after a route hop so SpatialController can settle.
   * Does not rewind zoom/fill or dispose the veil.
   */
  completeHandoff(): void {
    this.killTimeline();
    this.navigatedAtomId = null;
    this.overlay.setOpacity(0);
    this.controller.setTransitionDriven(false);
    this.transitionState.patch({
      busy: false,
      phase: 'idle',
    });
  }

  /**
   * Abort the current transition and ease back to rest.
   * Builds a fresh unwind timeline from live visuals (safe after retargets).
   */
  cancel(): void {
    this.navigationState.setCommitted('home');
    this.navigatedAtomId = null;
    this.controller.unfreeze();

    const from: TransitionProxy = {
      zoom: this.controller.zoomProgress,
      fill: this.controller.fillProgress,
      overlay: this.overlay.getOpacity(),
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
  ): gsap.core.Timeline {
    const proxy: TransitionProxy = { ...from };
    this.proxy = proxy;

    // Scale remaining work from current visuals so retargets do not rewind.
    const alreadyOnTarget =
      !atomChanged &&
      this.controller.getFocusedAtomId() === atomId &&
      this.controller.isFocusSettled();
    const focusDur = alreadyOnTarget
      ? 0
      : atomChanged
        ? FOCUS_DURATION
        : FOCUS_DURATION * 0.25;
    const approachGap = Math.max(1 - from.zoom, 1 - from.fill);
    const approachDur = APPROACH_DURATION * approachGap;

    const tl = gsap.timeline({
      onUpdate: () => {
        this.syncOutputs(atomId, proxy, tl.progress());
      },
      onComplete: () => {
        // Stay busy so hover focus does not fight the settled destination pose.
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

    // 1. Focus (skipped when the atom is already settled from the first click)
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

    // 2. Approach — zoom + fill as one continuous pull-in
    tl.addLabel('approach');
    tl.call(
      () => {
        if (tl.reversed()) return;
        this.transitionState.patch({ phase: 'approach' });
        this.controller.prepareTransitionTarget(atomId);
      },
      [],
      'approach',
    );
    if (approachDur > 0.001) {
      tl.to(
        proxy,
        {
          zoom: 1,
          fill: 1,
          duration: approachDur,
          ease: 'power2.inOut',
        },
        'approach',
      );
    } else {
      proxy.zoom = 1;
      proxy.fill = 1;
      tl.call(
        () => {
          this.controller.setZoomProgress(1);
          this.controller.setFillProgress(1);
        },
        [],
        'approach',
      );
    }

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

    return tl;
  }

  private syncOutputs(
    atomId: string,
    proxy: TransitionProxy,
    progress: number,
  ): void {
    this.controller.setZoomProgress(proxy.zoom);
    this.controller.setFillProgress(proxy.fill);
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
  }
}
