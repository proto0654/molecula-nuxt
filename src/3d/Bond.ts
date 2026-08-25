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
    this.line.computeLineDistances();
    this.line.raycast = () => {};
    this.line.frustumCulled = false;
  }

  get object(): Object3D {
    return this.line;
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
    this.line.computeLineDistances();
  }

  dispose(): void {
    this.geometry.dispose();
  }
}
