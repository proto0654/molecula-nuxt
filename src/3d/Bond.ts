import {
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type Object3D,
  type Vector3Like,
} from 'three';
import type { BondConfig } from './types';

const Y_AXIS = new Vector3(0, 1, 0);

export class Bond {
  readonly id: string;
  readonly mesh: Mesh;

  constructor(config: BondConfig, from: Vector3Like, to: Vector3Like) {
    this.id = config.id;

    const start = new Vector3(from.x, from.y, from.z);
    const end = new Vector3(to.x, to.y, to.z);
    const direction = new Vector3().subVectors(end, start);
    const length = direction.length();

    const geometry = new CylinderGeometry(0.06, 0.06, length, 12);
    const material = new MeshStandardMaterial({
      color: 0x9aa3ad,
      roughness: 0.55,
      metalness: 0.1,
    });

    this.mesh = new Mesh(geometry, material);
    this.mesh.name = `bond-${config.id}`;
    this.mesh.position.copy(start).add(end).multiplyScalar(0.5);

    if (length > 1e-6) {
      this.mesh.quaternion.setFromUnitVectors(Y_AXIS, direction.normalize());
    }
  }

  get object(): Object3D {
    return this.mesh;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    const material = this.mesh.material;
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else {
      material.dispose();
    }
  }
}
