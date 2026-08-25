import {
  type Camera,
  Color,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  type Object3D,
} from 'three';
import { AtomLabel } from './AtomLabel';
import type { AtomConfig } from './types';

const COLOR_BY_LABEL: Record<string, number> = {
  C: 0x4a5560,
  H: 0xd6dbe0,
  O: 0xc0392b,
  N: 0x2f6fed,
};

const HIGHLIGHT_EMISSIVE = new Color(0x6a7a8a);
const HIGHLIGHT_INTENSITY = 0.45;

export class Atom {
  readonly id: string;
  readonly label: string;
  readonly radius: number;
  readonly mesh: Mesh;
  readonly atomLabel: AtomLabel;
  private readonly material: MeshStandardMaterial;
  private highlighted = false;

  constructor(config: AtomConfig) {
    this.id = config.id;
    this.label = config.label;
    this.radius = config.radius;

    const geometry = new SphereGeometry(config.radius, 32, 32);
    this.material = new MeshStandardMaterial({
      color: COLOR_BY_LABEL[config.label] ?? 0x7f8c9a,
      roughness: 0.45,
      metalness: 0.05,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });

    this.mesh = new Mesh(geometry, this.material);
    this.mesh.position.set(...config.position);
    this.mesh.name = `atom-${config.id}`;
    this.mesh.userData.atomId = config.id;

    this.atomLabel = new AtomLabel(config.label, config.radius);
    this.mesh.add(this.atomLabel.object);
  }

  get object(): Object3D {
    return this.mesh;
  }

  setHighlighted(highlighted: boolean): void {
    if (this.highlighted === highlighted) return;
    this.highlighted = highlighted;
    if (highlighted) {
      this.material.emissive.copy(HIGHLIGHT_EMISSIVE);
      this.material.emissiveIntensity = HIGHLIGHT_INTENSITY;
    } else {
      this.material.emissive.setHex(0x000000);
      this.material.emissiveIntensity = 0;
    }
  }

  updateLabel(camera: Camera): void {
    this.atomLabel.update(camera);
  }

  dispose(): void {
    this.atomLabel.dispose();
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
