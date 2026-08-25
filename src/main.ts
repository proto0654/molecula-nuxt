import './styles.css';
import { MoleculeController } from './3d/MoleculeController';
import { getItemByAtomId, getItemById } from './navigation/navigationConfig';
import { Navigator } from './navigation/Navigator';
import { NavigationState } from './navigation/NavigationState';
import { DestinationView } from './ui/DestinationView';
import { HudFrame } from './ui/HudFrame';
import { Navigation } from './ui/Navigation';

const MOBILE_MQ = '(max-width: 767px)';
const TABLET_MQ = '(min-width: 768px) and (max-width: 1023px)';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Missing #app root');
}

const canvas = document.createElement('canvas');
canvas.id = 'hero-canvas';
app.append(canvas);

const controller = new MoleculeController(canvas);
controller.start();

const navigationState = new NavigationState();
const hud = new HudFrame(app);

const mobileMq = window.matchMedia(MOBILE_MQ);
const tabletMq = window.matchMedia(TABLET_MQ);

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

function applyViewportMode(): void {
  controller.setCaptionsCompact(mobileMq.matches);
  controller.setCaptionRemainderScale(tabletMq.matches ? 0.82 : 1);
}

function applyVisuals(): void {
  const committedId = navigationState.committedItemId;
  const previewId = navigationState.previewItemId;
  const highlightId = committedId ?? previewId;
  const highlightItem = highlightId ? getItemById(highlightId) : undefined;
  controller.setHighlightedAtom(highlightItem?.atomId ?? null);

  if (committedId) {
    const committed = getItemById(committedId);
    controller.setHaloAtom(committed?.atomId ?? null, 'committed');
  } else if (previewId) {
    const preview = getItemById(previewId);
    controller.setHaloAtom(preview?.atomId ?? null, 'hover');
  } else {
    controller.setHaloAtom(null, 'idle');
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

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    mobileMq.removeEventListener('change', onViewportChange);
    tabletMq.removeEventListener('change', onViewportChange);
    unsubscribeNav();
    unsubscribeHover();
    unsubscribeClick();
    unsubscribeTransition();
    navigator.dispose();
    navigation.dispose();
    destination.dispose();
    hud.dispose();
    controller.dispose();
  });
}
