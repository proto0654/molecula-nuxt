import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { Atom } from './Atom';
import { AtomLabel } from './AtomLabel';
import { Bond } from './Bond';
import type { MoleculeData } from './types';

export class MoleculeScene {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  readonly moleculeGroup: Group;

  private readonly atoms: Atom[] = [];
  private readonly bonds: Bond[] = [];
  private readonly labels: AtomLabel[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new Scene();
    this.scene.background = new Color(0x0f1115);

    this.camera = new PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 0.6, 4.5);
    this.camera.lookAt(0, 0.2, 0);

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setClearColor(0x0f1115, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.moleculeGroup = new Group();
    this.scene.add(this.moleculeGroup);

    const ambient = new AmbientLight(0xffffff, 0.55);
    const key = new DirectionalLight(0xffffff, 0.85);
    key.position.set(3, 4, 5);
    this.scene.add(ambient, key);

    this.resize(window.innerWidth, window.innerHeight);
  }

  buildMolecule(data: MoleculeData): void {
    this.clearMolecule();

    const atomById = new Map<string, Atom>();

    for (const atomData of data.atoms) {
      const atom = new Atom(atomData);
      atomById.set(atom.id, atom);
      this.atoms.push(atom);
      this.moleculeGroup.add(atom.object);

      const label = new AtomLabel(atom.element, atom.mesh.position);
      this.labels.push(label);
      this.moleculeGroup.add(label.object);
    }

    for (const bondData of data.bonds) {
      const from = atomById.get(bondData.fromAtomId);
      const to = atomById.get(bondData.toAtomId);
      if (!from || !to) continue;

      const bond = new Bond(bondData, from.mesh.position, to.mesh.position);
      this.bonds.push(bond);
      this.moleculeGroup.add(bond.object);
    }
  }

  resize(width: number, height: number): void {
    const w = Math.max(width, 1);
    const h = Math.max(height, 1);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  update(_deltaSeconds: number): void {
    // Reserved for future per-frame scene updates.
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.clearMolecule();
    this.renderer.dispose();
  }

  private clearMolecule(): void {
    for (const atom of this.atoms) {
      this.moleculeGroup.remove(atom.object);
      atom.dispose();
    }
    for (const bond of this.bonds) {
      this.moleculeGroup.remove(bond.object);
      bond.dispose();
    }
    for (const label of this.labels) {
      this.moleculeGroup.remove(label.object);
      label.dispose();
    }
    this.atoms.length = 0;
    this.bonds.length = 0;
    this.labels.length = 0;
  }
}
