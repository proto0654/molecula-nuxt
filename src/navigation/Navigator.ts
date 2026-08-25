import gsap from 'gsap';
import type { MoleculeController } from '../3d/MoleculeController';
import { TransitionOverlay } from '../ui/TransitionOverlay';
import { getItemByAtomId } from './navigationConfig';
import type { NavigationState } from './NavigationState';
import { TransitionState } from './TransitionState';

export type NavigateListener = (atomId: string) => void;

export type NavigatorOptions = {
  controller: MoleculeController;
  navigationState: NavigationState;
  /** Host for the transition overlay (usually `#app`). */
  overlayParent: HTMLElement;
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
const ZOOM_DURATION = 0.85;
const FILL_DURATION = 0.55;
const OVERLAY_DURATION = 0.45;
/** Overlay starts slightly before fill ends (fraction of fill duration). */
const OVERLAY_OVERLAP_RATIO = 0.35;
/** When the navigate callback fires, as a fraction of the overlay tween. */
const NAVIGATE_AT_OVERLAY_RATIO = 0.4;

/**
 * Page-transition coordinator: owns the GSAP timeline and `TransitionState`.
 * Scene verbs stay on `MoleculeController`; no route / history logic here.
 */
export class Navigator {
  readonly transitionState = new TransitionState();

  private readonly controller: MoleculeController;
  private readonly navigationState: NavigationState;
  private readonly overlay: TransitionOverlay;
  private readonly navigateListeners = new Set<NavigateListener>();

  private timeline: gsap.core.Timeline | null = null;
  private proxy: TransitionProxy = { zoom: 0, fill: 0, overlay: 0 };
  /** Atom id for which `onNavigate` already fired on this forward run. */
  private navigatedAtomId: string | null = null;

  constructor(options: NavigatorOptions) {
    this.controller = options.controller;
    this.navigationState = options.navigationState;
    this.overlay = new TransitionOverlay(options.overlayParent);
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
   * Start or retarget the focus → zoom → fill → overlay timeline.
   * Safe to call again with another atom mid-flight (interruptible).
   */
  navigateTo(atomId: string): void {
    if (!this.controller.scene.getAtom(atomId)) return;

    const item = getItemByAtomId(atomId);
    this.navigationState.setCommitted(item?.id ?? null);

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
   * Abort the current transition and ease back to rest.
   * Builds a fresh unwind timeline from live visuals (safe after retargets).
   */
  cancel(): void {
    this.navigationState.setCommitted(null);
    this.navigatedAtomId = null;

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

    // Unwind: veil first, then fill, then zoom — opposite of enter order.
    if (from.overlay > 0.001) {
      tl.to(proxy, {
        overlay: 0,
        duration: OVERLAY_DURATION * from.overlay,
        ease: 'power1.out',
      });
    }
    if (from.fill > 0.001) {
      tl.to(
        proxy,
        {
          fill: 0,
          duration: FILL_DURATION * from.fill,
          ease: 'power2.out',
        },
        from.overlay > 0.001 ? '-=0.1' : 0,
      );
    }
    if (from.zoom > 0.001) {
      tl.to(proxy, {
        zoom: 0,
        duration: ZOOM_DURATION * from.zoom,
        ease: 'power2.inOut',
      });
    }
    tl.call(() => {
      this.controller.clearFocus();
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
    this.overlay.dispose();
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
    const focusDur = atomChanged
      ? FOCUS_DURATION
      : FOCUS_DURATION * 0.25;
    const zoomDur = ZOOM_DURATION * (1 - from.zoom);
    const fillDur = FILL_DURATION * (1 - from.fill);
    const overlayDur = OVERLAY_DURATION * (1 - from.overlay);
    const overlayOverlap = fillDur * OVERLAY_OVERLAP_RATIO;

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

    // 1. Focus
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
    tl.to({}, { duration: Math.max(focusDur, 0.01) }, 'focus');

    // 2. Zoom — duration shrinks if already partially zoomed
    tl.addLabel('zoom');
    tl.call(
      () => {
        if (tl.reversed()) return;
        this.transitionState.patch({ phase: 'zoom' });
        this.controller.prepareTransitionTarget(atomId);
      },
      [],
      'zoom',
    );
    if (zoomDur > 0.001) {
      tl.to(
        proxy,
        {
          zoom: 1,
          duration: zoomDur,
          ease: 'power2.inOut',
        },
        'zoom',
      );
    } else {
      proxy.zoom = 1;
      tl.call(
        () => {
          this.controller.setZoomProgress(1);
        },
        [],
        'zoom',
      );
    }

    // 3. Fill viewport (extra proximity beyond base framing)
    tl.addLabel('fill');
    tl.call(
      () => {
        if (tl.reversed()) return;
        this.transitionState.patch({ phase: 'fill' });
      },
      [],
      'fill',
    );
    if (fillDur > 0.001) {
      tl.to(
        proxy,
        {
          fill: 1,
          duration: fillDur,
          ease: 'power2.in',
        },
        'fill',
      );
    } else {
      proxy.fill = 1;
      tl.call(
        () => {
          this.controller.setFillProgress(1);
        },
        [],
        'fill',
      );
    }

    // 4. Overlay veil (overlaps end of fill when fill still has room)
    const overlayOffset = fillDur > 0.001 ? Math.max(fillDur - overlayOverlap, 0) : 0;
    tl.addLabel('overlay', `fill+=${overlayOffset}`);
    tl.call(
      () => {
        if (tl.reversed()) return;
        this.transitionState.patch({ phase: 'overlay' });
      },
      [],
      'overlay',
    );
    if (overlayDur > 0.001) {
      tl.to(
        proxy,
        {
          overlay: 1,
          duration: overlayDur,
          ease: 'power1.in',
        },
        'overlay',
      );
    } else {
      proxy.overlay = 1;
      tl.call(
        () => {
          this.overlay.setOpacity(1);
        },
        [],
        'overlay',
      );
    }

    // 5. Navigate cue — forward only; swap this listener for a real router later
    const navigateOffset = overlayDur * NAVIGATE_AT_OVERLAY_RATIO;
    tl.addLabel('navigate', `overlay+=${navigateOffset}`);
    tl.call(
      () => {
        if (tl.reversed()) return;
        this.emitNavigate(atomId);
      },
      [],
      'navigate',
    );

    // Already past the navigate point (e.g. retarget with full overlay) → fire now.
    if (from.overlay >= NAVIGATE_AT_OVERLAY_RATIO) {
      tl.call(
        () => {
          this.emitNavigate(atomId);
        },
        [],
        0,
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
    this.controller.clearFocus();
    this.overlay.setOpacity(0);
    this.navigatedAtomId = null;
  }

  private killTimeline(): void {
    if (!this.timeline) return;
    this.timeline.kill();
    this.timeline = null;
  }
}
