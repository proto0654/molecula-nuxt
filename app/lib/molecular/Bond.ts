import {
  BufferAttribute,
  BufferGeometry,
  Line,
  LineDashedMaterial,
  Vector3,
  type Object3D,
  type Vector3Like,
} from 'three';
import type { BondConfig } from './types';

const scratchDir = new Vector3();
const scratchStart = new Vector3();
const scratchEnd = new Vector3();

/**
 * Thin dashed connector between atom centers (inset by radii).
 * Not a raycast target. Owns its geometry; material is scene-shared.
 */
export class Bond {
  readonly id: string;
  readonly line: Line;
  private readonly geometry: BufferGeometry;
  /** Authored inset endpoints - draw progress lerps the far vertex along it. */
  private readonly startPoint = new Vector3();
  private readonly endPoint = new Vector3();
  /** 0 = collapsed into the start point, 1 = authored connector. */
  private drawProgress = 1;

  constructor(
    config: BondConfig,
    from: Vector3Like,
    to: Vector3Like,
    fromRadius: number,
    toRadius: number,
    material: LineDashedMaterial,
  ) {
    this.id = config.id;

    scratchDir.set(to.x - from.x, to.y - from.y, to.z - from.z);
    const length = scratchDir.length();
    if (length > 1e-6) {
      scratchDir.multiplyScalar(1 / length);
    }

    const insetStart = Math.min(fromRadius * 0.92, length * 0.4);
    const insetEnd = Math.min(toRadius * 0.92, length * 0.4);

    scratchStart.set(from.x, from.y, from.z).addScaledVector(scratchDir, insetStart);
    scratchEnd.set(to.x, to.y, to.z).addScaledVector(scratchDir, -insetEnd);

    const positions = new Float32Array([
      scratchStart.x,
      scratchStart.y,
      scratchStart.z,
      scratchEnd.x,
      scratchEnd.y,
      scratchEnd.z,
    ]);
    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(positions, 3));

    this.line = new Line(this.geometry, material);
    this.line.name = `bond-${config.id}`;
    this.startPoint.copy(scratchStart);
    this.endPoint.copy(scratchEnd);
    this.syncDraw();
    this.line.raycast = () => {};
    this.line.frustumCulled = false;
  }

  get object(): Object3D {
    return this.line;
  }

  setMaterial(material: LineDashedMaterial): void {
    this.line.material = material;
  }

  /** Rebuild endpoints when atom layout (orbit / hub radius) changes. */
  setEndpoints(
    from: Vector3Like,
    to: Vector3Like,
    fromRadius: number,
    toRadius: number,
  ): void {
    scratchDir.set(to.x - from.x, to.y - from.y, to.z - from.z);
    const length = scratchDir.length();
    if (length > 1e-6) {
      scratchDir.multiplyScalar(1 / length);
    }

    const insetStart = Math.min(fromRadius * 0.92, length * 0.4);
    const insetEnd = Math.min(toRadius * 0.92, length * 0.4);

    scratchStart.set(from.x, from.y, from.z).addScaledVector(scratchDir, insetStart);
    scratchEnd.set(to.x, to.y, to.z).addScaledVector(scratchDir, -insetEnd);

    const attr = this.geometry.getAttribute('position') as BufferAttribute;
    attr.setXYZ(0, scratchStart.x, scratchStart.y, scratchStart.z);
    attr.setXYZ(1, scratchEnd.x, scratchEnd.y, scratchEnd.z);
    attr.needsUpdate = true;
    this.startPoint.copy(scratchStart);
    this.endPoint.copy(scratchEnd);
    this.syncDraw();
  }

  /**
   * Home boot: grow the connector out of its start atom.
   * The dashed pattern is recomputed so dash size stays authored.
   */
  setDrawProgress(progress: number): void {
    const next = Math.max(0, Math.min(1, progress));
    if (Math.abs(next - this.drawProgress) < 1e-4) return;
    this.drawProgress = next;
    this.syncDraw();
  }

  private syncDraw(): void {
    const attr = this.geometry.getAttribute('position') as BufferAttribute;
    attr.setXYZ(
      1,
      this.startPoint.x + (this.endPoint.x - this.startPoint.x) * this.drawProgress,
      this.startPoint.y + (this.endPoint.y - this.startPoint.y) * this.drawProgress,
      this.startPoint.z + (this.endPoint.z - this.startPoint.z) * this.drawProgress,
    );
    attr.needsUpdate = true;
    this.line.computeLineDistances();
    this.line.visible = this.drawProgress > 0.002;
  }

  dispose(): void {
    this.geometry.dispose();
  }
}
