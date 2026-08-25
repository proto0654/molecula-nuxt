import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { Atom } from './Atom';
import { Bond } from './Bond';
import type { MoleculeConfig } from './types';

export class MoleculeScene {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  readonly moleculeGroup: Group;
  readonly labelsGroup: Group;

  private readonly atoms: Atom[] = [];
  private readonly bonds: Bond[] = [];
  /** Atom meshes only — used for hover raycasting (bonds excluded). */
  private readonly atomMeshes: Mesh[] = [];

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

    this.moleculeGroup = new Group();
    this.scene.add(this.moleculeGroup);

    this.labelsGroup = new Group();
    this.labelsGroup.name = 'atom-labels';
    this.scene.add(this.labelsGroup);

    const ambient = new AmbientLight(0xffffff, 0.55);
    const key = new DirectionalLight(0xffffff, 0.85);
    key.position.set(3, 4, 5);
    this.scene.add(ambient, key);

    this.resize(window.innerWidth, window.innerHeight);
  }

  buildMolecule(config: MoleculeConfig): void {
    this.clearMolecule();

    const atomById = new Map<string, Atom>();

    for (const atomConfig of config.atoms) {
      const atom = new Atom(atomConfig);
      atomById.set(atom.id, atom);
      this.atoms.push(atom);
      this.atomMeshes.push(atom.mesh);
      this.moleculeGroup.add(atom.object);
      this.labelsGroup.add(atom.atomLabel.object);
    }

    for (const bondConfig of config.bonds) {
      const from = atomById.get(bondConfig.from);
      const to = atomById.get(bondConfig.to);
      if (!from || !to) continue;

      const bond = new Bond(bondConfig, from.mesh.position, to.mesh.position);
      this.bonds.push(bond);
      this.moleculeGroup.add(bond.object);
    }
  }

  /** Atom sphere meshes for picking; never includes bonds. */
  getAtomMeshes(): readonly Mesh[] {
    return this.atomMeshes;
  }

  getAtom(id: string): Atom | undefined {
    return this.atoms.find((atom) => atom.id === id);
  }

  getAtoms(): readonly Atom[] {
    return this.atoms;
  }

  resize(width: number, height: number): void {
    const w = Math.max(width, 1);
    const h = Math.max(height, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  /**
   * Updates atom labels when `updateLabels` is true.
   * Typewriter + halos always tick.
   * Caller must have already refreshed `moleculeGroup` world matrices.
   */
  update(deltaSeconds: number, updateLabels = true, elapsed = 0): void {
    for (const atom of this.atoms) {
      if (updateLabels) {
        atom.updateLabel(this.camera);
      }
      atom.tickLabelTypewriter(deltaSeconds);
      atom.updateHalo(this.camera, deltaSeconds, elapsed);
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.clearMolecule();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private clearMolecule(): void {
    for (const atom of this.atoms) {
      this.labelsGroup.remove(atom.atomLabel.object);
      this.moleculeGroup.remove(atom.object);
      atom.dispose();
    }
    for (const bond of this.bonds) {
      this.moleculeGroup.remove(bond.object);
      bond.dispose();
    }
    this.atoms.length = 0;
    this.bonds.length = 0;
    this.atomMeshes.length = 0;
  }
}
