import {
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  type Object3D,
} from 'three';
import type { AtomData } from './types';

export class Atom {
  readonly id: string;
  readonly element: string;
  readonly mesh: Mesh;

  constructor(data: AtomData) {
    this.id = data.id;
    this.element = data.element;

    const geometry = new SphereGeometry(data.radius, 32, 32);
    const material = new MeshStandardMaterial({
      color: data.color,
      roughness: 0.45,
      metalness: 0.05,
    });

    this.mesh = new Mesh(geometry, material);
    this.mesh.position.set(data.position.x, data.position.y, data.position.z);
    this.mesh.name = `atom-${data.id}`;
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
