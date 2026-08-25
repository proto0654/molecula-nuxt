import './styles.css';
import { MoleculeController } from './3d/MoleculeController';
import { NavigationState } from './navigation/NavigationState';
import { Navigation } from './ui/Navigation';

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
const navigation = new Navigation(app, navigationState);

const unsubscribeNav = navigationState.subscribe((_activeItemId, item) => {
  if (item) {
    controller.focusAtom(item.atomId);
    controller.setHighlightedAtom(item.atomId);
  } else {
    controller.clearFocus();
    controller.setHighlightedAtom(null);
  }
});

const unsubscribeHover = controller.onAtomHover((atomId) => {
  navigationState.setAtomHover(atomId);
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribeNav();
    unsubscribeHover();
    navigation.dispose();
    controller.dispose();
  });
}
