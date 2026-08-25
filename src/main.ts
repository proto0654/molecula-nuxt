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

// Keep references for future wiring / HMR-friendly dispose.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    navigation.dispose();
    controller.dispose();
  });
}
