import { Euler, Quaternion } from 'three';
import { moleculeConfig } from './moleculeConfig';
import { MoleculeScene } from './MoleculeScene';

/** Limited yaw / pitch from pointer (radians) — not a full turn. */
const MAX_YAW = Math.PI / 5;
const MAX_PITCH = Math.PI / 7;

/** Higher = snappier slerp toward `targetMouseQuaternion`. */
const MOUSE_FOLLOW = 6;

export type PointerNorm = {
  /** Normalized X in [-1, 1]; 0 = screen center. */
  x: number;
  /** Normalized Y in [-1, 1]; 0 = screen center; +Y = up. */
  y: number;
};

export class MoleculeController {
  readonly scene: MoleculeScene;

  /**
   * Current smoothed mouse influence on molecule orientation.
   * Kept separate from a future focusAtom quaternion layer.
   */
  private readonly mouseQuaternion = new Quaternion();

  /** Target mouse influence from the latest pointer sample. */
  private readonly targetMouseQuaternion = new Quaternion();

  private readonly scratchEuler = new Euler(0, 0, 0, 'YXZ');
  private readonly pointerNorm: PointerNorm = { x: 0, y: 0 };

  private rafId = 0;
  private lastTime = 0;
  private running = false;
  private readonly canvas: HTMLCanvasElement;
  private readonly onResizeBound: () => void;
  private readonly onPointerMoveBound: (event: PointerEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new MoleculeScene(canvas);
    this.scene.buildMolecule(moleculeConfig);

    this.onResizeBound = () => {
      this.scene.resize(window.innerWidth, window.innerHeight);
    };

    this.onPointerMoveBound = (event: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.max(rect.width, 1);
      const h = Math.max(rect.height, 1);
      this.pointerNorm.x = ((event.clientX - rect.left) / w) * 2 - 1;
      this.pointerNorm.y = -(((event.clientY - rect.top) / h) * 2 - 1);
      this.updateMouseInfluence(this.pointerNorm);
    };
  }

  /**
   * Maps normalized pointer [-1, 1] into a limited yaw/pitch target.
   * Center (0, 0) → identity (base orientation).
   */
  updateMouseInfluence(pointer: PointerNorm): void {
    const nx = Math.max(-1, Math.min(1, pointer.x));
    const ny = Math.max(-1, Math.min(1, pointer.y));
    this.scratchEuler.set(ny * MAX_PITCH, nx * MAX_YAW, 0, 'YXZ');
    this.targetMouseQuaternion.setFromEuler(this.scratchEuler);
  }

  /**
   * Frame-rate independent mouse follow + scene tick.
   * Applies only `mouseQuaternion` (focusAtom will compose separately later).
   */
  update(delta: number): void {
    const t = 1 - Math.exp(-MOUSE_FOLLOW * delta);
    this.mouseQuaternion.slerp(this.targetMouseQuaternion, t);
    this.scene.moleculeGroup.quaternion.copy(this.mouseQuaternion);
    this.scene.update(delta);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('pointermove', this.onPointerMoveBound);
    this.onResizeBound();
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    cancelAnimationFrame(this.rafId);
  }

  dispose(): void {
    this.stop();
    this.scene.dispose();
  }

  private readonly tick = (time: number): void => {
    if (!this.running) return;
    const deltaSeconds = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.update(deltaSeconds);
    this.scene.render();
    this.rafId = requestAnimationFrame(this.tick);
  };
}
