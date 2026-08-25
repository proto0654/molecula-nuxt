import {
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  type Object3D,
} from 'three';
import type { AtomConfig } from './types';

const COLOR_BY_LABEL: Record<string, number> = {
  C: 0x4a5560,
  H: 0xd6dbe0,
  O: 0xc0392b,
  N: 0x2f6fed,
};

export class Atom {
  readonly id: string;
  readonly label: string;
  readonly mesh: Mesh;

  constructor(config: AtomConfig) {
    this.id = config.id;
    this.label = config.label;

    const geometry = new SphereGeometry(config.radius, 32, 32);
    const material = new MeshStandardMaterial({
      color: COLOR_BY_LABEL[config.label] ?? 0x7f8c9a,
      roughness: 0.45,
      metalness: 0.05,
    });

    this.mesh = new Mesh(geometry, material);
    this.mesh.position.set(...config.position);
    this.mesh.name = `atom-${config.id}`;
    this.mesh.userData.atomId = config.id;
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
