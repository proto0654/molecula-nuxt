import {
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  Vector3,
  type Object3D,
} from 'three';
import type { BondData } from './types';

export class Bond {
  readonly id: string;
  readonly line: Line;

  constructor(
    data: BondData,
    from: Vector3 | { x: number; y: number; z: number },
    to: Vector3 | { x: number; y: number; z: number },
  ) {
    this.id = data.id;

    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute(
        [from.x, from.y, from.z, to.x, to.y, to.z],
        3,
      ),
    );

    const material = new LineBasicMaterial({
      color: 0x9aa3ad,
      linewidth: 1,
    });

    this.line = new Line(geometry, material);
    this.line.name = `bond-${data.id}`;
  }

  get object(): Object3D {
    return this.line;
  }

  dispose(): void {
    this.line.geometry.dispose();
    const material = this.line.material;
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else {
      material.dispose();
    }
  }
}
