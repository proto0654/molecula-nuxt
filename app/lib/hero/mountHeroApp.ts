import {
  COMPOSITION_PROFILES,
  resolveViewportMode,
} from '../molecular/composition/profiles';
import { MoleculeController } from '../molecular/MoleculeController';
import { QualityManager } from '../molecular/quality/QualityManager';
import { PerfOverlay } from '../debug/PerfOverlay';
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

const MOBILE_MQ = '(max-width: 767px)';
const TABLET_MQ = '(min-width: 768px) and (max-width: 1023px)';
const DESKTOP_MQ = '(min-width: 1024px)';

/**
 * Imperative hero bootstrap (former Vite `main.ts`).
 * Vue owns mount/unmount; Three.js + HUD classes own scene/UI internals.
 */
export type MountHeroAppOptions = {
  /**
   * Called when Navigator finishes the overlay and the nav item has a real route.
   * Home `/` still uses the destination stub.
   */
  onNavigateRoute?: (route: string) => void | Promise<void>;
};

export function mountHeroApp(
  root: HTMLElement,
  options: MountHeroAppOptions = {},
): () => void {
  const canvas = document.createElement('canvas');
  canvas.id = 'hero-canvas';
  root.append(canvas);

  const quality = new QualityManager();
  const controller = new MoleculeController(canvas, quality);
  controller.start();

  const perfOverlay = PerfOverlay.tryCreate(root, quality, () =>
    controller.scene.getPixelRatio(),
  );
  const unsubscribePerf = perfOverlay
    ? controller.onAfterUpdate((delta) => {
        perfOverlay.record(delta);
      })
    : () => {};

  const navigationState = new NavigationState();
  const hud = new HudFrame(root);
  const siteHeader = new SiteHeader(root, navigationState);
  const uspHeadline = new UspHeadline(root);

  const mobileMq = window.matchMedia(MOBILE_MQ);
  const tabletMq = window.matchMedia(TABLET_MQ);
  const desktopMq = window.matchMedia(DESKTOP_MQ);

  const navigator = new Navigator({
    controller,
    navigationState,
    overlayParent: root,
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

  const unsubscribeTransition = navigator.transitionState.subscribe((snap) => {
    if (snap.phase === 'idle') {
      destination.hide();
    }
  });

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

    if (!committedId) {
      controller.setAtomBlurb(null, null);
      uspHeadline.hide();
    }

    if (navigator.busy) return;

    const focusItem = committedId ? getItemById(committedId) : undefined;
    if (focusItem) {
      controller.focusAtom(focusItem.atomId);
    } else {
      controller.clearFocus();
    }
  }

  function selectItem(itemId: string): void {
    if (navigator.busy) return;
    const item = getItemById(itemId);
    if (!item) return;

    if (navigationState.committedItemId === itemId) {
      navigator.navigateTo(item.atomId);
      return;
    }

    navigationState.setCommitted(itemId);
    controller.focusAtom(item.atomId);
    controller.setAtomBlurb(item.atomId, item.blurb);
    uspHeadline.arm(item.usp);
  }

  function clearSelection(): void {
    if (navigator.busy) {
      destination.hide();
      navigator.cancel();
      return;
    }
    navigationState.setCommitted(null);
    controller.clearZoom();
    controller.clearFocus();
    controller.setAtomBlurb(null, null);
    uspHeadline.hide();
  }

  const navigation = new Navigation(root, navigationState, selectItem);

  const mobileNav = new MobileNavOverlay(root, navigationState, {
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

  const connector = new NavigationConnector(
    root,
    navigation,
    navigationState,
    (atomId, out) => controller.projectAtom(atomId, out),
  );

  function applyViewportMode(): void {
    const mode = resolveViewportMode({
      desktop: desktopMq.matches,
      tablet: tabletMq.matches,
    });
    const profile = COMPOSITION_PROFILES[mode];
    controller.setCaptionsCompact(false);
    controller.setCaptionRemainderScale(mode === 'tablet' ? 0.82 : 1);
    controller.setCompositionProfile(profile);
    document.documentElement.style.setProperty(
      '--composition-screen-y',
      String(profile.screenY),
    );
    connector.setEnabled(mode === 'desktop');
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
    navigationState.setAtomHover(atomId);
    canvas.classList.toggle('is-atom-hover', atomId !== null);
  });

  const unsubscribeClick = controller.onAtomClick((atomId) => {
    if (atomId) {
      const item = getItemByAtomId(atomId);
      if (item) selectItem(item.id);
      return;
    }
    clearSelection();
  });

  function onViewportChange(): void {
    applyViewportMode();
  }

  applyViewportMode();
  mobileMq.addEventListener('change', onViewportChange);
  tabletMq.addEventListener('change', onViewportChange);
  desktopMq.addEventListener('change', onViewportChange);

  return () => {
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
  };
}
