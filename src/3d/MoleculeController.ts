import gsap from 'gsap';
import { moleculeConfig } from './moleculeConfig';
import { MoleculeScene } from './MoleculeScene';

export class MoleculeController {
  readonly scene: MoleculeScene;

  private rafId = 0;
  private lastTime = 0;
  private running = false;
  private readonly onResizeBound: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new MoleculeScene(canvas);
    this.scene.buildMolecule(moleculeConfig);

    gsap.to(this.scene.moleculeGroup.rotation, {
      y: Math.PI * 2,
      duration: 28,
      ease: 'none',
      repeat: -1,
    });

    this.onResizeBound = () => {
      this.scene.resize(window.innerWidth, window.innerHeight);
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    window.addEventListener('resize', this.onResizeBound);
    this.onResizeBound();
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    window.removeEventListener('resize', this.onResizeBound);
    cancelAnimationFrame(this.rafId);
    gsap.killTweensOf(this.scene.moleculeGroup.rotation);
  }

  dispose(): void {
    this.stop();
    this.scene.dispose();
  }

  private readonly tick = (time: number): void => {
    if (!this.running) return;
    const deltaSeconds = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.scene.update(deltaSeconds);
    this.scene.render();
    this.rafId = requestAnimationFrame(this.tick);
  };
}
