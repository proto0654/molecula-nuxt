import {
  COMPOSITION_PROFILES,
  HOME_DESKTOP_FRAMING,
  resolveViewportMode,
} from '../molecular/composition/profiles';
import { MoleculeController } from '../molecular/MoleculeController';
import { QualityManager } from '../molecular/quality/QualityManager';
import { PerfOverlay } from '../debug/PerfOverlay';
import { SpatialOverlay } from '../debug/SpatialOverlay';
import {
  buildAtomBlurb,
  subscribePointerInput,
} from '../navigation/buildAtomBlurb';
import {
  getItemByAtomId,
  getItemById,
  navigationConfig,
} from '../navigation/navigationConfig';
import { Navigator } from '../navigation/Navigator';
import { NavigationState } from '../navigation/NavigationState';
import { DestinationView } from '../hero-ui/DestinationView';
import { HudFrame } from '../hero-ui/HudFrame';
import { MobileNavOverlay } from '../hero-ui/MobileNavOverlay';
import { Navigation } from '../hero-ui/Navigation';
import { NavigationConnector } from '../hero-ui/NavigationConnector';
import { SiteHeader } from '../hero-ui/SiteHeader';
import { UspHeadline } from '../hero-ui/UspHeadline';
import { HeroAutoplay } from './HeroAutoplay';
import { HOME_ITEM_ID, hubAtomId } from '../spatial/spatialAtoms';
import { prefersReducedMotion } from '../a11y/reducedMotion';
import { SpatialController, type SpatialApplyOptions } from '../spatial/SpatialController';
import type { SpatialState } from '../spatial/types';
import type { TransitionListener } from '../navigation/TransitionState';
import type { TagCloudItem } from '../molecular/TagCloud';

const MOBILE_MQ = '(max-width: 767px)';
const TABLET_MQ = '(min-width: 768px) and (max-width: 1023px)';
const DESKTOP_MQ = '(min-width: 1024px)';

const SLIDE_DURATION_MS = 5500;
const IDLE_RESUME_MS = 2000;

/**
 * Imperative hero bootstrap (former Vite `main.ts`).
 * Vue owns mount/unmount; Three.js + HUD classes own scene/UI internals.
 * Layout-owned: one canvas / controller / loop for the life of the shell.
 */
export type MountHeroAppOptions = {
  /** Persistent chrome host (header, nav, USP, connectors, mobile overlay). */
  chromeRoot: HTMLElement;
  /** Public asset base (Nuxt `app.baseURL`). */
  assetBaseURL?: string;
  /**
   * Called when Navigator finishes the approach and the nav item has a real route.
   * Home `/` still uses the destination stub.
   */
  onNavigateRoute?: (route: string) => void | Promise<void>;
  /** Warm the destination chunk on first commit (first click), not on reveal. */
  prefetchRoute?: (route: string) => void;
};

export type MountedHeroApp = {
  dispose: () => void;
  applySpatial: (state: SpatialState, options?: SpatialApplyOptions) => void;
  isBusy: () => boolean;
  onTransition: (listener: TransitionListener) => () => void;
  setTagCloud: (tags: readonly TagCloudItem[]) => void;
};

export function mountHeroApp(
  stage: HTMLElement,
  options: MountHeroAppOptions,
): MountedHeroApp {
  const chromeRoot = options.chromeRoot;
  chromeRoot.classList.add('is-home');

  const canvas = document.createElement('canvas');
  canvas.id = 'hero-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute(
    'aria-label',
    'Интерактивная навигация-молекула: выберите раздел сайта',
  );
  stage.append(canvas);
  stage.classList.add('is-interactive');

  const quality = new QualityManager();
  const controller = new MoleculeController(canvas, quality);
  controller.start();

  const perfOverlay = PerfOverlay.tryCreate(chromeRoot, quality, () =>
    controller.scene.getPixelRatio(),
  );
  const unsubscribePerf = perfOverlay
    ? controller.onAfterUpdate((delta) => {
        perfOverlay.record(delta);
      })
    : () => {};

  const spatialOverlay = SpatialOverlay.tryCreate(chromeRoot);

  const navigationState = new NavigationState();
  navigationState.setCommitted(HOME_ITEM_ID);

  const hud = new HudFrame(stage);
  const siteHeader = new SiteHeader(chromeRoot, navigationState, {
    assetBaseURL: options.assetBaseURL,
  });
  const uspHeadline = new UspHeadline(chromeRoot);

  const mobileMq = window.matchMedia(MOBILE_MQ);
  const tabletMq = window.matchMedia(TABLET_MQ);
  const desktopMq = window.matchMedia(DESKTOP_MQ);

  const navigator = new Navigator({
    controller,
    navigationState,
    overlayParent: stage,
  });

  const destination = new DestinationView(navigator.overlayRoot);
  destination.setReturnHandler(() => {
    destination.hide();
    navigator.cancel();
  });

  navigator.onNavigate((atomId) => {
    const item = getItemByAtomId(atomId);
    if (!item) return;
    const route = item.route;
    if (route && route !== '/' && options.onNavigateRoute) {
      void options.onNavigateRoute(route);
      return;
    }
    destination.show(item);
  });

  let isHome = true;

  function syncSpatialDebug(state: SpatialState): void {
    spatialOverlay?.set({
      mode: state.mode,
      target: controller.getFocusedAtomId(),
      context: state.context,
      entityId: state.entityId,
      instanceId: controller.instanceId,
    });
  }

  function activateCommittedItem(itemId: string): void {
    const item = getItemById(itemId);
    if (!item) return;
    controller.focusAtom(item.atomId);
    controller.setAtomBlurb(item.atomId, buildAtomBlurb(item));
    uspHeadline.arm(item.usp);
  }

  function applyAccentWireframe(): void {
    const committedId = navigationState.committedItemId;
    const previewId = navigationState.previewItemId;
    const hasDistinctPreview = Boolean(
      previewId && previewId !== committedId,
    );
    const previewItem =
      hasDistinctPreview && previewId ? getItemById(previewId) : undefined;
    const committedItem = committedId ? getItemById(committedId) : undefined;

    if (!isHome || navigator.busy) {
      controller.setAccentWireframeAtom(null, null);
      return;
    }

    if (hasDistinctPreview && previewItem) {
      controller.setAccentWireframeAtom(previewItem.atomId, 'static');
      return;
    }

    if (autoplay.isDwelling()) {
      const nextId = autoplay.getNextItemId();
      const nextItem = nextId ? getItemById(nextId) : undefined;
      if (nextItem && nextItem.atomId !== committedItem?.atomId) {
        controller.setAccentWireframeAtom(nextItem.atomId, 'pulse');
        return;
      }
    }

    controller.setAccentWireframeAtom(null, null);
  }

  function applyBondFlow(): void {
    if (prefersReducedMotion()) {
      controller.setBondFlowAtom(null);
      return;
    }

    const committedId = navigationState.committedItemId;
    const previewId = navigationState.previewItemId;
    const hasDistinctPreview = Boolean(
      previewId && previewId !== committedId,
    );
    const previewItem =
      hasDistinctPreview && previewId ? getItemById(previewId) : undefined;
    const committedItem = committedId ? getItemById(committedId) : undefined;

    if (!isHome || navigator.busy) {
      controller.setBondFlowAtom(null);
      return;
    }

    if (hasDistinctPreview && previewItem) {
      controller.setBondFlowAtom(previewItem.atomId);
      return;
    }

    if (autoplay.isDwelling()) {
      const nextId = autoplay.getNextItemId();
      const nextItem = nextId ? getItemById(nextId) : undefined;
      if (nextItem && nextItem.atomId !== committedItem?.atomId) {
        controller.setBondFlowAtom(nextItem.atomId);
        return;
      }
    }

    controller.setBondFlowAtom(null);
  }

  function applyVisuals(): void {
    const committedId = navigationState.committedItemId;
    const previewId = navigationState.previewItemId;
    const hasDistinctPreview = Boolean(
      previewId && previewId !== committedId,
    );
    const committedItem = committedId ? getItemById(committedId) : undefined;
    const previewItem =
      hasDistinctPreview && previewId ? getItemById(previewId) : undefined;

    const highlightAtomId = hasDistinctPreview
      ? previewItem?.atomId
      : committedItem?.atomId ?? previewItem?.atomId ?? null;
    controller.setHighlightedAtom(highlightAtomId ?? null);
    controller.setActiveOrbitAtom(highlightAtomId ?? null);

    controller.setHaloStates(
      committedItem?.atomId ?? null,
      hasDistinctPreview ? previewItem?.atomId ?? null : null,
    );
    controller.setWireframeAtom(committedItem?.atomId ?? null);
    applyAccentWireframe();
    applyBondFlow();

    const titleHighlightIds: string[] = [];
    if (isHome && committedItem && committedId && !navigator.busy) {
      titleHighlightIds.push(committedItem.atomId);
    }
    if (hasDistinctPreview && previewItem) {
      titleHighlightIds.push(previewItem.atomId);
    }
    controller.setAtomTitleHighlight(titleHighlightIds);

    const hubId = hubAtomId();
    const hideHubLabel =
      isHome &&
      ((committedItem?.atomId !== undefined && committedItem.atomId !== hubId) ||
        (hasDistinctPreview && previewItem?.atomId !== hubId));

    if (mobileMq.matches && isHome) {
      for (const item of navigationConfig.items) {
        const atomId = item.atomId;
        const inFocus =
          hasDistinctPreview && previewItem?.atomId === atomId
            ? true
            : !hasDistinctPreview && committedItem?.atomId === atomId;
        controller.setAtomLabelVisible(atomId, inFocus);
      }
    } else {
      controller.setAtomLabelVisible(hubId, !hideHubLabel);
      for (const item of navigationConfig.items) {
        if (item.atomId !== hubId) {
          controller.setAtomLabelVisible(item.atomId, true);
        }
      }
    }

    if (!isHome) {
      controller.setAtomBlurb(null, null);
      uspHeadline.hide();
      return;
    }

    if (!committedId || navigator.busy) {
      controller.setAtomBlurb(null, null);
      uspHeadline.hide();
    }

    if (navigator.busy) return;

    const focusItem = committedId ? getItemById(committedId) : undefined;
    if (focusItem) {
      controller.focusAtom(focusItem.atomId);
    } else {
      controller.restoreOverview();
    }
  }

  function selectItem(itemId: string): void {
    if (navigator.busy) return;
    const item = getItemById(itemId);
    if (!item) return;

    if (!isHome) {
      if (item.route) {
        void options.onNavigateRoute?.(item.route);
      }
      return;
    }

    if (navigationState.committedItemId === itemId) {
      if (itemId === HOME_ITEM_ID || item.route === '/') return;
      uspHeadline.hide();
      autoplay.pause();
      navigator.navigateTo(item.atomId);
      return;
    }

    if (item.route && item.route !== '/') {
      options.prefetchRoute?.(item.route);
    }
    autoplay.pause();
    navigationState.setCommitted(itemId);
    activateCommittedItem(itemId);
  }

  /**
   * Header + burger. Home: one-shot leave (`navigateTo` — orbit+zoom, then route).
   * Off-home: route first, SpatialController retargets / unwinds.
   */
  function selectFromMenu(itemId: string): void {
    if (navigator.busy) return;
    const item = getItemById(itemId);
    if (!item) return;

    if (itemId === HOME_ITEM_ID) {
      if (isHome) {
        restoreHomeSelection();
      } else if (item.route) {
        void options.onNavigateRoute?.(item.route);
      }
      return;
    }

    if (isHome && item.route && item.route !== '/') {
      options.prefetchRoute?.(item.route);
      autoplay.pause();
      uspHeadline.hide();
      controller.setAtomBlurb(null, null);
      navigator.navigateTo(item.atomId);
      return;
    }

    if (item.route) {
      if (item.route !== '/') options.prefetchRoute?.(item.route);
      autoplay.pause();
      uspHeadline.hide();
      void options.onNavigateRoute?.(item.route);
    }
  }

  function restoreHomeSelection(): void {
    if (navigator.busy) {
      destination.hide();
      navigator.cancel();
      return;
    }
    navigationState.setCommitted(HOME_ITEM_ID);
    controller.restoreOverview();
    controller.clearZoom();
    activateCommittedItem(HOME_ITEM_ID);
    autoplay.resetTo(HOME_ITEM_ID);
  }

  const navigation = new Navigation(chromeRoot, navigationState, selectItem);

  function setSlideProgress(ratio: number): void {
    siteHeader.setSlideProgress(ratio);
    navigation.setSlideProgress(ratio);
  }

  const autoplay = new HeroAutoplay({
    items: navigationConfig.items.map((item) => item.id),
    slideDurationMs: SLIDE_DURATION_MS,
    idleResumeMs: IDLE_RESUME_MS,
    onAdvance: (itemId) => {
      navigationState.setCommitted(itemId);
      activateCommittedItem(itemId);
    },
    onProgress: setSlideProgress,
  });

  const mobileNav = new MobileNavOverlay(chromeRoot, navigationState, {
    assetBaseURL: options.assetBaseURL,
    onHome: () => {
      setMenuOpen(false);
      selectFromMenu(HOME_ITEM_ID);
    },
    onSelect: (itemId) => {
      setMenuOpen(false);
      selectFromMenu(itemId);
    },
    onClose: () => setMenuOpen(false),
  });

  let suppressMenuToggleUntil = 0;

  function setMenuOpen(open: boolean): void {
    mobileNav.setOpen(open);
    siteHeader.setMenuOpen(open);
    if (open) {
      autoplay.pause();
      return;
    }
    suppressMenuToggleUntil = performance.now() + 400;
  }

  siteHeader.onToggleMenu(() => {
    if (performance.now() < suppressMenuToggleUntil) return;
    setMenuOpen(!mobileNav.isOpen);
  });

  /** Header logo + route links — same direct hop as off-home / mobile menu. */
  siteHeader.onSelectItem((itemId) => {
    selectFromMenu(itemId);
  });

  const unsubscribeTransition = navigator.transitionState.subscribe((snap) => {
    controller.setApproachBusy(snap.busy);
    if (snap.phase === 'idle') {
      destination.hide();
    }
    chromeRoot.classList.toggle('is-approaching', snap.busy);
    if (snap.busy) {
      uspHeadline.hide();
      if (mobileNav.isOpen) setMenuOpen(false);
    }
  });

  const connector = new NavigationConnector(
    chromeRoot,
    navigation,
    navigationState,
    (atomId, out) => controller.projectAtom(atomId, out),
  );

  function applyHudMode(home: boolean): void {
    isHome = home;
    stage.classList.toggle('is-interactive', home);
    chromeRoot.classList.toggle('is-home', home);
    canvas.classList.toggle('is-atom-hover', false);
    if (!home) {
      autoplay.stop();
      uspHeadline.hide();
      destination.hide();
      connector.setEnabled(false);
      if (mobileNav.isOpen) setMenuOpen(false);
    } else {
      autoplay.start(navigationState.committedItemId ?? HOME_ITEM_ID);
    }
    // Re-apply framing: home desktop bias vs centered profile.
    applyViewportMode();
  }

  const spatial = new SpatialController(controller, navigationState, {
    completeHandoff: () => navigator.completeHandoff(),
    isLiveApproach: (atomId) => navigator.isLiveApproach(atomId),
    retargetApproach: (atomId) => navigator.retargetApproach(atomId),
    approachTo: (atomId) => navigator.approachTo(atomId),
    onModeChange: (state) => {
      applyHudMode(state.mode === 'home');
      syncSpatialDebug(state);
    },
    onHomeActivated: () => {
      activateCommittedItem(HOME_ITEM_ID);
      autoplay.start(HOME_ITEM_ID);
    },
  });

/** Mobile: smaller atom captions and typewriter blurbs. */
const MOBILE_CAPTION_TITLE_SCALE = 0.72;
const MOBILE_CAPTION_BLURB_SCALE = 0.88;

  function applyViewportMode(): void {
    const mode = resolveViewportMode({
      desktop: desktopMq.matches,
      tablet: tabletMq.matches,
    });
    const profile = COMPOSITION_PROFILES[mode];
    controller.setCaptionsCompact(false);
    controller.setCaptionRemainderScale(mode === 'tablet' ? 0.82 : 1);
    controller.setCaptionTitleScale(
      mode === 'mobile' ? MOBILE_CAPTION_TITLE_SCALE : 1,
    );
    controller.setCaptionBlurbScale(
      mode === 'mobile' ? MOBILE_CAPTION_BLURB_SCALE : 1,
    );
    controller.setCompositionProfile(profile);
    // Home desktop only: stage bias. Elsewhere profile is already centered.
    // Skip while Navigator owns framing (approach / retarget center override).
    // Leaving rest toward an off-home approach: keep the current override so
    // approachTo can tween it — same capture as retarget from a settled pose.
    if (!navigator.busy) {
      if (isHome && mode === 'desktop') {
        controller.setCompositionFramingOverride(HOME_DESKTOP_FRAMING);
      } else if (isHome) {
        controller.setCompositionFramingOverride(null);
      } else if (controller.isAtApproach()) {
        controller.setCompositionFramingOverride(null);
        controller.syncApproachFramingForFocusedAtom();
      }
    }
    document.documentElement.style.setProperty(
      '--composition-screen-y',
      String(
        isHome && mode === 'desktop'
          ? HOME_DESKTOP_FRAMING.screenY
          : profile.screenY,
      ),
    );
    connector.setEnabled(isHome && mode === 'desktop');
    if (mode !== 'mobile' && mobileNav.isOpen) {
      setMenuOpen(false);
    }
  }

  const unsubscribeConnector = controller.onAfterUpdate((delta) => {
    const zoomFade = Math.min(
      1,
      controller.zoomProgress * 0.55 + controller.fillProgress * 0.85,
    );
    connector.setZoomFade(zoomFade);
    navigation.setZoomSoftness(zoomFade);
    uspHeadline.setZoomFade(zoomFade);
    connector.update(delta);

    autoplay.tick(delta * 1000, {
      isHome,
      busy: navigator.busy,
      isFocusSettled: controller.isFocusSettled(),
      hasUserPreview: navigationState.previewItemId !== null,
      menuOpen: mobileNav.isOpen,
      committedItemId: navigationState.committedItemId,
    });
    applyAccentWireframe();
    applyBondFlow();

    if (
      isHome &&
      !navigator.busy &&
      navigationState.committedItemId &&
      controller.isFocusSettled()
    ) {
      uspHeadline.tryReveal();
    }
  });

  const unsubscribeNav = navigationState.subscribe(() => {
    applyVisuals();
  });

  const unsubscribeHover = controller.onAtomHover((atomId) => {
    if (!isHome) return;
    navigationState.setAtomHover(atomId);
    canvas.classList.toggle('is-atom-hover', atomId !== null);
  });

  const unsubscribeClick = controller.onAtomClick((atomId) => {
    if (!isHome) return;
    if (atomId) {
      const item = getItemByAtomId(atomId);
      if (item) selectItem(item.id);
      return;
    }
    restoreHomeSelection();
  });

  function onViewportChange(): void {
    applyViewportMode();
    applyVisuals();
  }

  applyViewportMode();
  applyVisuals();
  activateCommittedItem(HOME_ITEM_ID);
  autoplay.start(HOME_ITEM_ID);
  mobileMq.addEventListener('change', onViewportChange);
  tabletMq.addEventListener('change', onViewportChange);
  desktopMq.addEventListener('change', onViewportChange);

  const unsubscribePointer = subscribePointerInput(() => {
    const committedId = navigationState.committedItemId;
    if (!committedId) return;
    const item = getItemById(committedId);
    if (item) controller.setAtomBlurb(item.atomId, buildAtomBlurb(item));
  });

  return {
    applySpatial(state, applyOptions) {
      spatial.apply(state, applyOptions);
      syncSpatialDebug(state);
    },
    isBusy: () => navigator.busy,
    onTransition: (listener) => navigator.transitionState.subscribe(listener),
    setTagCloud(tags) {
      controller.setTagCloud(tags);
    },
    dispose() {
      autoplay.stop();
      mobileMq.removeEventListener('change', onViewportChange);
      tabletMq.removeEventListener('change', onViewportChange);
      desktopMq.removeEventListener('change', onViewportChange);
      unsubscribePointer();
      unsubscribeNav();
      unsubscribeHover();
      unsubscribeClick();
      unsubscribeTransition();
      unsubscribeConnector();
      unsubscribePerf();
      perfOverlay?.dispose();
      spatialOverlay?.dispose();
      navigator.dispose();
      connector.dispose();
      navigation.dispose();
      mobileNav.dispose();
      siteHeader.dispose();
      uspHeadline.dispose();
      destination.dispose();
      hud.dispose();
      controller.dispose();
      canvas.remove();
    },
  };
}
