import { Euler, Quaternion, Vector3 } from 'three';
import { AtomHover, type AtomHoverListener } from './AtomHover';
import { getStableFocusQuaternion } from './math/focusAtom';
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
   * Kept separate from the focusAtom quaternion layer.
   */
  private readonly mouseQuaternion = new Quaternion();

  /** Target mouse influence from the latest pointer sample. */
  private readonly targetMouseQuaternion = new Quaternion();

  /** Current smoothed focus orientation (rest → atom toward camera). */
  private readonly focusQuaternion = new Quaternion();

  /** Target focus orientation from the latest `focusAtom` call. */
  private readonly targetFocusQuaternion = new Quaternion();

  /**
   * Focus follow rate for frame-rate independent slerp (`1 - exp(-k·Δt)`).
   * Higher = snappier approach to `targetFocusQuaternion`.
   */
  focusStrength = 4;

  /** Last orientation used for hover picking — dirty when it diverges. */
  private readonly lastHoverQuaternion = new Quaternion();

  private readonly scratchEuler = new Euler(0, 0, 0, 'YXZ');
  private readonly scratchCompose = new Quaternion();
  private readonly scratchMoleculePos = new Vector3();
  private readonly scratchAtomPos = new Vector3();
  private readonly scratchCameraPos = new Vector3();
  private readonly pointerNorm: PointerNorm = { x: 0, y: 0 };
  private readonly atomHover = new AtomHover();

  private rafId = 0;
  private lastTime = 0;
  private running = false;
  private readonly canvas: HTMLCanvasElement;
  private readonly onResizeBound: () => void;
  private readonly onPointerMoveBound: (event: PointerEvent) => void;
  private readonly onPointerLeaveBound: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new MoleculeScene(canvas);
    this.scene.buildMolecule(moleculeConfig);

    this.onResizeBound = () => {
      this.scene.resize(window.innerWidth, window.innerHeight);
      // Aspect / projection changed — refresh pick under the same pointer.
      this.atomHover.markDirty();
    };

    this.onPointerMoveBound = (event: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.max(rect.width, 1);
      const h = Math.max(rect.height, 1);
      this.pointerNorm.x = ((event.clientX - rect.left) / w) * 2 - 1;
      this.pointerNorm.y = -(((event.clientY - rect.top) / h) * 2 - 1);
      this.updateMouseInfluence(this.pointerNorm);
      this.atomHover.setPointerNdc(this.pointerNorm.x, this.pointerNorm.y);
    };

    this.onPointerLeaveBound = () => {
      this.atomHover.clear();
    };
  }

  getHoveredAtomId(): string | null {
    return this.atomHover.getHoveredAtomId();
  }

  /**
   * Enter/leave: fires with the hovered atom id, or `null` when the pointer leaves atoms.
   * Suitable for wiring focus later.
   */
  onAtomHover(listener: AtomHoverListener): () => void {
    return this.atomHover.onAtomHover(listener);
  }

  /**
   * Sets `targetFocusQuaternion` so the atom faces the camera.
   * Uses rest-frame atom position (local + molecule translation) so the result
   * is an absolute focus orientation, independent of the mouse layer.
   * Twist/roll is locked relative to the current `focusQuaternion`.
   */
  focusAtom(atomId: string): void {
    const atom = this.scene.getAtom(atomId);
    if (!atom) return;

    this.scene.moleculeGroup.getWorldPosition(this.scratchMoleculePos);
    // Rest pose: ignore current group rotation so focus Q stays absolute.
    this.scratchAtomPos.copy(atom.mesh.position).add(this.scratchMoleculePos);
    this.scene.camera.getWorldPosition(this.scratchCameraPos);

    this.targetFocusQuaternion.copy(
      getStableFocusQuaternion(
        this.scratchAtomPos,
        this.scratchMoleculePos,
        this.scratchCameraPos,
        this.focusQuaternion,
      ),
    );
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
   * Frame-rate independent mouse + focus follow, then compose onto the group.
   * `final = focusQuaternion * mouseQuaternion` — layers stay separate.
   */
  update(delta: number): void {
    const mouseT = 1 - Math.exp(-MOUSE_FOLLOW * delta);
    this.mouseQuaternion.slerp(this.targetMouseQuaternion, mouseT);

    const focusT = 1 - Math.exp(-this.focusStrength * delta);
    this.focusQuaternion.slerp(this.targetFocusQuaternion, focusT);

    this.scratchCompose.copy(this.focusQuaternion).multiply(this.mouseQuaternion);
    this.scene.moleculeGroup.quaternion.copy(this.scratchCompose);

    // Molecule moved under a still pointer → need a fresh pick (not every idle frame).
    if (!this.lastHoverQuaternion.equals(this.scratchCompose)) {
      this.lastHoverQuaternion.copy(this.scratchCompose);
      this.atomHover.markDirty();
    }

    this.scene.update(delta);
    this.updateHover();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('pointermove', this.onPointerMoveBound);
    document.addEventListener('pointerleave', this.onPointerLeaveBound);
    this.onResizeBound();
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    document.removeEventListener('pointerleave', this.onPointerLeaveBound);
    cancelAnimationFrame(this.rafId);
  }

  dispose(): void {
    this.stop();
    this.scene.dispose();
  }

  private updateHover(): void {
    // Matrices must reflect the just-applied molecule quaternion before picking.
    this.scene.moleculeGroup.updateMatrixWorld(true);
    this.atomHover.update(this.scene.camera, this.scene.getAtomMeshes());
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
