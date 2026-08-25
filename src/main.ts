import './styles.css';
import { MoleculeController } from './3d/MoleculeController';
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

const navigation = new Navigation(app);

// Temporary hover debug overlay (no visual focus yet).
const hoverOverlay = document.createElement('div');
hoverOverlay.className = 'hover-debug';
hoverOverlay.textContent = 'hover: —';
app.append(hoverOverlay);

const unsubscribeHover = controller.onAtomHover((atomId) => {
  hoverOverlay.textContent = `hover: ${atomId ?? '—'}`;
});

// Keep references for future wiring / HMR-friendly dispose.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribeHover();
    navigation.dispose();
    controller.dispose();
  });
}
