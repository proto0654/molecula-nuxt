import {
  COMPOSITION_PROFILES,
  HOME_DESKTOP_FRAMING,
  resolveViewportMode,
} from '../molecular/composition/profiles';
import { MoleculeController } from '../molecular/MoleculeController';
import { QualityManager } from '../molecular/quality/QualityManager';
import { PerfOverlay } from '../debug/PerfOverlay';
import { SpatialOverlay } from '../debug/SpatialOverlay';
import { getItemByAtomId, getItemById } from '../navigation/navigationConfig';
import { Navigator } from '../navigation/Navigator';
import { NavigationState } from '../navigation/NavigationState';
import { DestinationView } from '../hero-ui/DestinationView';
import { HudFrame } from '../hero-ui/HudFrame';
import { MobileNavOverlay } from '../hero-ui/MobileNavOverlay';
import { Navigation } from '../hero-ui/Navigation';
import { NavigationConnector } from '../hero-ui/NavigationConnector';
import { SiteHeader } from '../hero-ui/SiteHeader';
import { UspHeadline } from '../hero-ui/UspHeadline';
import { HOME_ITEM_ID } from '../spatial/spatialAtoms';
import { SpatialController, type SpatialApplyOptions } from '../spatial/SpatialController';
import type { SpatialState } from '../spatial/types';
import type { TransitionListener } from '../navigation/TransitionState';

const MOBILE_MQ = '(max-width: 767px)';
const TABLET_MQ = '(min-width: 768px) and (max-width: 1023px)';
const DESKTOP_MQ = '(min-width: 1024px)';

/**
 * Imperative hero bootstrap (former Vite `main.ts`).
 * Vue owns mount/unmount; Three.js + HUD classes own scene/UI internals.
 * Layout-owned: one canvas / controller / loop for the life of the shell.
 */
export type MountHeroAppOptions = {
  /** Persistent chrome host (header, nav, USP, connectors, mobile overlay). */
  chromeRoot: HTMLElement;
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
};

export function mountHeroApp(
  stage: HTMLElement,
  options: MountHeroAppOptions,
): MountedHeroApp {
  const chromeRoot = options.chromeRoot;
  chromeRoot.classList.add('is-home');

  const canvas = document.createElement('canvas');
  canvas.id = 'hero-canvas';
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
  const siteHeader = new SiteHeader(chromeRoot, navigationState);
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
    controller.setAtomBlurb(item.atomId, item.blurb);
    uspHeadline.arm(item.usp);
  }

  function applyVisuals(): void {
    const committedId = navigationState.committedItemId;
    const previewId = navigationState.previewItemId;
    const highlightId = committedId ?? previewId;
    const highlightItem = highlightId ? getItemById(highlightId) : undefined;
    controller.setHighlightedAtom(highlightItem?.atomId ?? null);
    controller.setActiveOrbitAtom(highlightItem?.atomId ?? null);

    if (committedId) {
      const committed = getItemById(committedId);
      controller.setHaloAtom(committed?.atomId ?? null, 'committed');
      controller.setWireframeAtom(committed?.atomId ?? null);
    } else if (previewId) {
      const preview = getItemById(previewId);
      controller.setHaloAtom(preview?.atomId ?? null, 'hover');
      controller.setWireframeAtom(null);
    } else {
      controller.setHaloAtom(null, 'idle');
      controller.setWireframeAtom(null);
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
      navigator.navigateTo(item.atomId);
      return;
    }

    if (item.route && item.route !== '/') {
      options.prefetchRoute?.(item.route);
    }
    navigationState.setCommitted(itemId);
    activateCommittedItem(itemId);
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
  }

  const navigation = new Navigation(chromeRoot, navigationState, selectItem);

  const mobileNav = new MobileNavOverlay(chromeRoot, navigationState, {
    onSelect: (itemId) => {
      selectItem(itemId);
      setMenuOpen(false);
    },
    onClose: () => setMenuOpen(false),
  });

  function setMenuOpen(open: boolean): void {
    mobileNav.setOpen(open);
    siteHeader.setMenuOpen(open);
  }

  siteHeader.onToggleMenu(() => {
    setMenuOpen(!mobileNav.isOpen);
  });

  /** Header logo / off-home route menu — direct hops, no atom commit. */
  siteHeader.onSelectItem((itemId) => {
    const item = getItemById(itemId);
    if (!item?.route) return;

    if (!isHome) {
      void options.onNavigateRoute?.(item.route);
      return;
    }

    if (itemId === HOME_ITEM_ID) {
      restoreHomeSelection();
    }
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
      uspHeadline.hide();
      destination.hide();
      connector.setEnabled(false);
      if (mobileNav.isOpen) setMenuOpen(false);
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
    },
  });

  function applyViewportMode(): void {
    const mode = resolveViewportMode({
      desktop: desktopMq.matches,
      tablet: tabletMq.matches,
    });
    const profile = COMPOSITION_PROFILES[mode];
    controller.setCaptionsCompact(false);
    controller.setCaptionRemainderScale(mode === 'tablet' ? 0.82 : 1);
    controller.setCompositionProfile(profile);
    // Home desktop only: stage bias. Elsewhere profile is already centered.
    // Skip while Navigator owns framing (approach / retarget center override).
    if (!navigator.busy) {
      if (isHome && mode === 'desktop') {
        controller.setCompositionFramingOverride(HOME_DESKTOP_FRAMING);
      } else {
        controller.setCompositionFramingOverride(null);
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
  }

  applyViewportMode();
  applyVisuals();
  activateCommittedItem(HOME_ITEM_ID);
  mobileMq.addEventListener('change', onViewportChange);
  tabletMq.addEventListener('change', onViewportChange);
  desktopMq.addEventListener('change', onViewportChange);

  return {
    applySpatial(state, applyOptions) {
      spatial.apply(state, applyOptions);
      syncSpatialDebug(state);
    },
    isBusy: () => navigator.busy,
    onTransition: (listener) => navigator.transitionState.subscribe(listener),
    dispose() {
      mobileMq.removeEventListener('change', onViewportChange);
      tabletMq.removeEventListener('change', onViewportChange);
      desktopMq.removeEventListener('change', onViewportChange);
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
