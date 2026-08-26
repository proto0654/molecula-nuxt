import {
  AmbientLight,
  Color,
  DirectionalLight,
  Fog,
  Group,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Mesh,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { Atom } from './Atom';
import { Bond } from './Bond';
import { DecorativeNodes } from './DecorativeNodes';
import type { QualityManager } from './quality/QualityManager';
import type { QualitySettings } from './quality/types';
import { GeometryCache } from './resources/GeometryCache';
import type { MoleculeConfig } from './types';

const SCENE_BG = 0x14161c;
const WIREFRAME_SCALE = 1.04;
const WIREFRAME_COLOR = 0xd6dbe0;
const BOND_COLOR = 0x5a636c;

/** Mobile-only: orbit span (peripheral positions + decorative rings). */
const MOBILE_ORBIT_SCALE = 0.58;
/** Mobile-only: hub sphere radius. */
const MOBILE_HUB_RADIUS_SCALE = 0.58;
/** Mobile-only: peripheral spheres — shrink less so they read larger vs the compact layout. */
const MOBILE_PERIPHERAL_RADIUS_SCALE = 0.78;

type BondLink = {
  bond: Bond;
  fromId: string;
  toId: string;
};

export class MoleculeScene {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  readonly moleculeGroup: Group;
  readonly labelsGroup: Group;

  private readonly quality: QualityManager;
  private readonly cache = new GeometryCache();
  private readonly atoms: Atom[] = [];
  private readonly bonds: Bond[] = [];
  private readonly bondLinks: BondLink[] = [];
  /** Atom meshes only — used for hover raycasting (bonds excluded). */
  private readonly atomMeshes: Mesh[] = [];
  private readonly bondMaterial: LineDashedMaterial;
  private readonly wireframeMaterial: LineBasicMaterial;
  private readonly wireframe: LineSegments;
  private readonly decorativeNodes: DecorativeNodes;
  private wireframeAtomId: string | null = null;
  private lastWidth = 1;
  private lastHeight = 1;
  private compactLayout = false;

  constructor(canvas: HTMLCanvasElement, quality: QualityManager) {
    this.quality = quality;

    this.scene = new Scene();
    this.scene.background = new Color(SCENE_BG);
    this.scene.fog = new Fog(SCENE_BG, 5, 16);

    this.camera = new PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 0.6, 4.5);
    this.camera.lookAt(0, 0.2, 0);

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(SCENE_BG, 1);
    this.renderer.shadowMap.enabled = false;

    this.moleculeGroup = new Group();
    this.scene.add(this.moleculeGroup);

    this.labelsGroup = new Group();
    this.labelsGroup.name = 'atom-labels';
    this.scene.add(this.labelsGroup);

    const ambient = new AmbientLight(0xffffff, 0.38);
    const key = new DirectionalLight(0xffffff, 0.9);
    key.position.set(3, 4, 5);
    key.castShadow = false;
    const fill = new DirectionalLight(0xd8dde4, 0.28);
    fill.position.set(-2.5, 1.2, -2);
    fill.castShadow = false;
    this.scene.add(ambient, key, fill);

    this.bondMaterial = new LineDashedMaterial({
      color: BOND_COLOR,
      transparent: true,
      opacity: 0.55,
      dashSize: 0.07,
      gapSize: 0.05,
      scale: 1,
      depthWrite: false,
    });

    this.wireframeMaterial = new LineBasicMaterial({
      color: WIREFRAME_COLOR,
      transparent: true,
      opacity: 0.22,
      depthTest: true,
      depthWrite: false,
    });

    this.wireframe = new LineSegments(
      this.cache.getUnitIcosahedronEdges(quality.get().atomDetail),
      this.wireframeMaterial,
    );
    this.wireframe.name = 'selection-wireframe';
    this.wireframe.raycast = () => {};
    this.wireframe.visible = false;
    this.wireframe.renderOrder = 2;

    this.decorativeNodes = new DecorativeNodes(this.cache);
    this.decorativeNodes.setVisible(quality.get().decorativeNodes);
    this.moleculeGroup.add(this.decorativeNodes.object);

    this.resize(window.innerWidth, window.innerHeight);
  }

  buildMolecule(config: MoleculeConfig): void {
    this.clearMolecule();

    const settings = this.quality.get();
    const atomById = new Map<string, Atom>();

    for (const atomConfig of config.atoms) {
      const atom = new Atom(atomConfig, this.cache, settings);
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

      const bond = new Bond(
        bondConfig,
        from.object.position,
        to.object.position,
        from.radius,
        to.radius,
        this.bondMaterial,
      );
      this.bonds.push(bond);
      this.bondLinks.push({
        bond,
        fromId: bondConfig.from,
        toId: bondConfig.to,
      });
      this.moleculeGroup.add(bond.object);
    }

    this.applyCompactLayout(this.compactLayout);
    this.syncWireframe();
  }

  /**
   * Mobile portrait: tighter orbits + smaller hub sphere.
   * Desktop / tablet stay at authored layout. No other properties change.
   */
  setCompactLayout(compact: boolean): void {
    if (this.compactLayout === compact) return;
    this.compactLayout = compact;
    this.applyCompactLayout(compact);
  }

  private applyCompactLayout(compact: boolean): void {
    const orbitScale = compact ? MOBILE_ORBIT_SCALE : 1;
    const hubScale = compact ? MOBILE_HUB_RADIUS_SCALE : 1;
    const peripheralScale = compact ? MOBILE_PERIPHERAL_RADIUS_SCALE : 1;
    const hub = this.atoms.find((atom) => atom.isHub);
    const peripheral = this.atoms.find((atom) => !atom.isHub);
    const hubLabelFontScale =
      compact && hub && peripheral
        ? peripheral.baseRadius / hub.baseRadius
        : 1;
    for (const atom of this.atoms) {
      atom.applyCompactLayout(
        orbitScale,
        hubScale,
        peripheralScale,
        hubLabelFontScale,
      );
    }
    this.decorativeNodes.setOrbitScale(orbitScale);
    this.syncBondEndpoints();
    this.syncWireframe();
  }

  private syncBondEndpoints(): void {
    for (const link of this.bondLinks) {
      const from = this.getAtom(link.fromId);
      const to = this.getAtom(link.toId);
      if (!from || !to) continue;
      link.bond.setEndpoints(
        from.object.position,
        to.object.position,
        from.radius,
        to.radius,
      );
    }
  }

  /**
   * Apply a locked quality preset in place — do not rebuild the molecule
   * (hover / commit / focus / zoom state must survive).
   */
  applyQuality(settings: QualitySettings): void {
    for (const atom of this.atoms) {
      atom.applyQuality(settings, this.cache);
    }
    this.wireframe.geometry = this.cache.getUnitIcosahedronEdges(
      settings.atomDetail,
    );
    this.decorativeNodes.setVisible(settings.decorativeNodes);
    this.syncWireframe();
    this.resize(this.lastWidth, this.lastHeight);
  }

  /** Committed atom only — hover must not show the wireframe shell. */
  setWireframeAtom(atomId: string | null): void {
    this.wireframeAtomId = atomId;
    this.syncWireframe();
  }

  /** White orbit for the active peripheral atom (hover or committed). */
  setActiveOrbitAtom(atomId: string | null): void {
    this.decorativeNodes.setActiveOrbitAtom(atomId);
  }

  setLabelsVisible(visible: boolean): void {
    this.labelsGroup.visible = visible;
  }

  setDecorativeZoomFade(zoomProgress: number, fillProgress: number): void {
    this.decorativeNodes.setZoomFade(zoomProgress, fillProgress);
  }

  /** Atom meshes for picking; never includes bonds. */
  getAtomMeshes(): readonly Mesh[] {
    return this.atomMeshes;
  }

  getAtom(id: string): Atom | undefined {
    return this.atoms.find((atom) => atom.id === id);
  }

  getAtoms(): readonly Atom[] {
    return this.atoms;
  }

  getPixelRatio(): number {
    return this.renderer.getPixelRatio();
  }

  resize(width: number, height: number): void {
    const w = Math.max(width, 1);
    const h = Math.max(height, 1);
    this.lastWidth = w;
    this.lastHeight = h;
    const maxRatio = this.quality.get().maxPixelRatio;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxRatio));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  /**
   * Updates atom labels when `updateLabels` is true.
   * Typewriter + selection indicator always tick (indicator early-outs when idle).
   * Caller must have already refreshed `moleculeGroup` world matrices.
   */
  update(deltaSeconds: number, updateLabels = true, elapsed = 0): void {
    for (const atom of this.atoms) {
      if (updateLabels) {
        atom.updateLabel(this.camera);
      }
      atom.tickLabelTypewriter(deltaSeconds);
      atom.updateSelection(this.camera, deltaSeconds, elapsed);
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.clearMolecule();
    this.decorativeNodes.dispose();
    this.wireframeMaterial.dispose();
    this.bondMaterial.dispose();
    this.cache.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private syncWireframe(): void {
    const enabled = this.quality.get().selectedWireframe;
    const atom = this.wireframeAtomId
      ? this.getAtom(this.wireframeAtomId)
      : undefined;
    if (!enabled || !atom) {
      this.wireframe.visible = false;
      this.wireframe.removeFromParent();
      return;
    }
    if (this.wireframe.parent !== atom.object) {
      atom.object.add(this.wireframe);
    }
    this.wireframe.scale.setScalar(atom.radius * WIREFRAME_SCALE);
    this.wireframe.visible = true;
  }

  private clearMolecule(): void {
    this.wireframe.removeFromParent();
    this.wireframe.visible = false;
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
    this.bondLinks.length = 0;
    this.atomMeshes.length = 0;
  }
}
