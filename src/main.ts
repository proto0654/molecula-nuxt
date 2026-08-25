import './styles.css';
import {
  COMPOSITION_PROFILES,
  resolveViewportMode,
} from './3d/composition/profiles';
import { MoleculeController } from './3d/MoleculeController';
import { QualityManager } from './3d/quality/QualityManager';
import { PerfOverlay } from './debug/PerfOverlay';
import { getItemByAtomId, getItemById } from './navigation/navigationConfig';
import { Navigator } from './navigation/Navigator';
import { NavigationState } from './navigation/NavigationState';
import { DestinationView } from './ui/DestinationView';
import { HudFrame } from './ui/HudFrame';
import { MobileNavOverlay } from './ui/MobileNavOverlay';
import { Navigation } from './ui/Navigation';
import { NavigationConnector } from './ui/NavigationConnector';
import { SiteHeader } from './ui/SiteHeader';

const MOBILE_MQ = '(max-width: 767px)';
const TABLET_MQ = '(min-width: 768px) and (max-width: 1023px)';
const DESKTOP_MQ = '(min-width: 1024px)';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Missing #app root');
}

const canvas = document.createElement('canvas');
canvas.id = 'hero-canvas';
app.append(canvas);

const quality = new QualityManager();
const controller = new MoleculeController(canvas, quality);
controller.start();

const perfOverlay = PerfOverlay.tryCreate(app, quality, () =>
  controller.scene.getPixelRatio(),
);
const unsubscribePerf = perfOverlay
  ? controller.onAfterUpdate((delta) => {
      perfOverlay.record(delta);
    })
  : () => {};

const navigationState = new NavigationState();
const hud = new HudFrame(app);
const siteHeader = new SiteHeader(app, navigationState);

const mobileMq = window.matchMedia(MOBILE_MQ);
const tabletMq = window.matchMedia(TABLET_MQ);
const desktopMq = window.matchMedia(DESKTOP_MQ);

const navigator = new Navigator({
  controller,
  navigationState,
  overlayParent: app,
});

const destination = new DestinationView(navigator.overlayRoot);
destination.setReturnHandler(() => {
  destination.hide();
  navigator.cancel();
});

navigator.onNavigate((atomId) => {
  const item = getItemByAtomId(atomId);
  if (item) destination.show(item);
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
}

const navigation = new Navigation(app, navigationState, selectItem);

const mobileNav = new MobileNavOverlay(app, navigationState, {
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
  app,
  navigation,
  navigationState,
  (atomId, out) => controller.projectAtom(atomId, out),
);

function applyViewportMode(): void {
  const mode = resolveViewportMode({
    desktop: desktopMq.matches,
    tablet: tabletMq.matches,
  });
  controller.setCaptionsCompact(false);
  controller.setCaptionRemainderScale(mode === 'tablet' ? 0.82 : 1);
  controller.setCompositionProfile(COMPOSITION_PROFILES[mode]);
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
  connector.update(delta);
});

const unsubscribeNav = navigationState.subscribe(() => {
  applyVisuals();
});

const unsubscribeHover = controller.onAtomHover((atomId) => {
  navigationState.setAtomHover(atomId);
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

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
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
    destination.dispose();
    hud.dispose();
    controller.dispose();
  });
}
