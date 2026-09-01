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
import { TagCloud, type TagCloudItem } from './TagCloud';
import type { QualityManager } from './quality/QualityManager';
import type { QualitySettings } from './quality/types';
import { GeometryCache } from './resources/GeometryCache';
import type { MoleculeConfig } from './types';
import { SCENE_BG } from './sceneColors';

const WIREFRAME_SCALE = 1.04;
const WIREFRAME_COLOR = 0xd6dbe0;
const WIREFRAME_DIM_COLOR = 0x4a4f54;
const WIREFRAME_OPACITY = 0.22;
/** Autoplay-next pulse: peak matches committed shell; trough nearly off. */
const PULSE_OPACITY_MIN = 0.035;
const PULSE_OPACITY_MAX = WIREFRAME_OPACITY;
const PULSE_SPEED = 2.4;
/** One bond dash repeat per wireframe pulse cycle (2π / PULSE_SPEED). */
const BOND_DASH_SIZE = 0.07;
const BOND_DASH_GAP = 0.05;
const BOND_DASH_PERIOD = BOND_DASH_SIZE + BOND_DASH_GAP;
/** Dash cycles per wireframe pulse beat — >1 reads livelier while staying in phase. */
const BOND_FLOW_RATE = 4;
const BOND_FLOW_SPEED =
  (BOND_DASH_PERIOD * PULSE_SPEED * BOND_FLOW_RATE) / (Math.PI * 2);
/** Slower enter/exit so fade reads clearly (not brighter). */
const ACCENT_ENTER_FOLLOW = 3.8;
/** Match AtomSelectionIndicator color follow for settled freeze chrome. */
const CHROME_COLOR_FOLLOW = 6;

function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export type AccentWireframeMode = 'static' | 'pulse';
const BOND_COLOR = 0x5a636c;
const BOND_IDLE_OPACITY = 0.55;
const BOND_FLOW_OPACITY = 0.68;
/** World-units per second — hover preview; autoplay locks to PULSE_SPEED via elapsed. */
const BOND_FLOW_ENTER_FOLLOW = 3.8;

type BondFlowMaterialUserData = {
  dashOffset?: { value: number };
};

/** Inject dashOffset into the dashed fragment shader (not exposed on the material in r178). */
function createBondFlowMaterial(): LineDashedMaterial {
  const material = new LineDashedMaterial({
    color: BOND_COLOR,
    transparent: true,
    opacity: BOND_FLOW_OPACITY,
    dashSize: BOND_DASH_SIZE,
    gapSize: BOND_DASH_GAP,
    scale: 1,
    depthWrite: false,
  });
  material.customProgramCacheKey = () => 'molecule-bond-flow-dash';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.dashOffset = { value: 0 };
    (material.userData as BondFlowMaterialUserData).dashOffset =
      shader.uniforms.dashOffset;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'uniform float totalSize;',
        'uniform float totalSize;\nuniform float dashOffset;',
      )
      .replace(
        'mod( vLineDistance, totalSize )',
        'mod( vLineDistance + dashOffset, totalSize )',
      );
  };
  return material;
}

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
  private readonly bondFlowMaterial: LineDashedMaterial;
  private bondFlowToAtomId: string | null = null;
  private bondFlowDashOffset = 0;
  private bondFlowEnterMix = 0;
  private targetBondFlowEnterMix = 0;
  private readonly wireframeMaterial: LineBasicMaterial;
  private readonly wireframe: LineSegments;
  private readonly accentWireframeMaterial: LineBasicMaterial;
  private readonly accentWireframe: LineSegments;
  private readonly decorativeNodes: DecorativeNodes;
  private readonly tagCloud: TagCloud;
  private wireframeAtomId: string | null = null;
  private accentWireframeAtomId: string | null = null;
  private accentWireframeMode: AccentWireframeMode | null = null;
  private accentEnterMix = 0;
  private targetAccentEnterMix = 0;
  private wireframeColorMix = 0;
  private targetWireframeColorMix = 0;
  private lastWidth = 1;
  private lastHeight = 1;
  private compactLayout = false;
  private readonly wireframeBaseColor = new Color(WIREFRAME_COLOR);
  private readonly wireframeDimColor = new Color(WIREFRAME_DIM_COLOR);
  private readonly bondBaseColor = new Color(BOND_COLOR);
  private readonly scratchWireframeColor = new Color();

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

    this.tagCloud = new TagCloud();
    this.scene.add(this.tagCloud.object);

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
      opacity: BOND_IDLE_OPACITY,
      dashSize: BOND_DASH_SIZE,
      gapSize: BOND_DASH_GAP,
      scale: 1,
      depthWrite: false,
    });
    this.bondFlowMaterial = createBondFlowMaterial();

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

    this.accentWireframeMaterial = new LineBasicMaterial({
      color: WIREFRAME_COLOR,
      transparent: true,
      opacity: WIREFRAME_OPACITY,
      depthTest: true,
      depthWrite: false,
    });
    this.accentWireframe = new LineSegments(
      this.cache.getUnitIcosahedronEdges(quality.get().atomDetail),
      this.accentWireframeMaterial,
    );
    this.accentWireframe.name = 'accent-wireframe';
    this.accentWireframe.raycast = () => {};
    this.accentWireframe.visible = false;
    this.accentWireframe.renderOrder = 2;

    this.decorativeNodes = new DecorativeNodes(this.cache);
    this.applyDecorativeQuality(quality.get());
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
    this.syncAccentWireframe();
    this.syncBondFlowMaterials();
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
    this.tagCloud.setLayoutScale(orbitScale);
    this.tagCloud.setMobileInk(compact);
    this.tagCloud.update(this.camera, this.moleculeGroup);
    this.syncBondEndpoints();
    this.syncWireframe();
    this.syncAccentWireframe();
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
    this.accentWireframe.geometry = this.cache.getUnitIcosahedronEdges(
      settings.atomDetail,
    );
    this.applyDecorativeQuality(settings);
    this.syncWireframe();
    this.syncAccentWireframe();
    this.resize(this.lastWidth, this.lastHeight);
  }

  private applyDecorativeQuality(settings: QualitySettings): void {
    this.decorativeNodes.applyQuality({
      orbits: settings.decorativeOrbits,
      ghostNodes: settings.decorativeNodes,
    });
  }

  /** Committed atom wireframe shell (static). */
  setWireframeAtom(atomId: string | null): void {
    this.wireframeAtomId = atomId;
    this.syncWireframe();
  }

  /** Preview / autoplay-next wireframe (static or pulsing). */
  setAccentWireframeAtom(
    atomId: string | null,
    mode: AccentWireframeMode | null,
  ): void {
    if (atomId && mode) {
      const prevAtom = this.accentWireframeAtomId;
      const prevMode = this.accentWireframeMode;
      this.accentWireframeAtomId = atomId;
      this.accentWireframeMode = mode;
      this.targetAccentEnterMix = 1;
      if (mode === 'pulse' && (prevAtom !== atomId || prevMode !== 'pulse')) {
        this.accentEnterMix = 0;
      } else if (mode === 'static') {
        this.accentEnterMix = 1;
      }
      this.syncAccentWireframe();
      return;
    }
    this.targetAccentEnterMix = 0;
  }

  private setBondFlowDashOffset(offset: number): void {
    this.bondFlowDashOffset = offset;
    const uniform = (this.bondFlowMaterial.userData as BondFlowMaterialUserData)
      .dashOffset;
    if (uniform) uniform.value = offset;
  }

  /** Hub → target atom: animate dash pattern along the bond (not opacity pulse). */
  setBondFlowAtom(atomId: string | null): void {
    if (atomId && this.bondLinks.some((link) => link.toId === atomId)) {
      if (this.bondFlowToAtomId !== atomId) {
        this.setBondFlowDashOffset(0);
        this.bondFlowToAtomId = atomId;
      }
      this.targetBondFlowEnterMix = 1;
      this.syncBondFlowMaterials();
      return;
    }
    this.targetBondFlowEnterMix = 0;
  }

  /** White orbit for the active peripheral atom (hover or committed). */
  setActiveOrbitAtom(atomId: string | null): void {
    this.decorativeNodes.setActiveOrbitAtom(atomId);
  }

  setLabelsVisible(visible: boolean): void {
    this.labelsGroup.visible = visible;
  }

  /**
   * Settled frozen approach: lerp selection reticle + wireframe toward dim chrome.
   * Leaving the state restores base chrome colors.
   */
  setChromeDimmed(dimmed: boolean): void {
    this.targetWireframeColorMix = dimmed ? 1 : 0;
    for (const atom of this.atoms) {
      atom.setSelectionDimmed(dimmed);
    }
  }

  setDecorativeZoomFade(
    zoomProgress: number,
    fillProgress: number,
    options?: { keepOrbitsVisible?: boolean },
  ): void {
    const keepOrbits = options?.keepOrbitsVisible ?? false;
    this.decorativeNodes.setZoomFade(
      keepOrbits ? 0 : zoomProgress,
      keepOrbits ? 0 : fillProgress,
    );
    this.tagCloud.setZoomFade(zoomProgress, fillProgress);
  }

  setTagCloud(tags: readonly TagCloudItem[]): void {
    this.tagCloud.setTags(tags);
    this.tagCloud.update(this.camera, this.moleculeGroup);
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
    this.updateWireframeDim(deltaSeconds);
    this.updateAccentWireframePulse(deltaSeconds, elapsed);
    this.updateBondFlow(deltaSeconds, elapsed);
    for (const atom of this.atoms) {
      if (updateLabels) {
        atom.updateLabel(this.camera);
      }
      atom.tickLabelTypewriter(deltaSeconds);
      atom.updateSelection(this.camera, deltaSeconds, elapsed);
    }
    this.tagCloud.update(this.camera, this.moleculeGroup);
  }

  private updateWireframeDim(deltaSeconds: number): void {
    const t = 1 - Math.exp(-CHROME_COLOR_FOLLOW * deltaSeconds);
    this.wireframeColorMix +=
      (this.targetWireframeColorMix - this.wireframeColorMix) * t;
    this.scratchWireframeColor.lerpColors(
      this.wireframeBaseColor,
      this.wireframeDimColor,
      this.wireframeColorMix,
    );
    this.wireframeMaterial.color.copy(this.scratchWireframeColor);
    this.accentWireframeMaterial.color.copy(this.scratchWireframeColor);

    const shellMix = this.wireframeColorMix;
    this.scratchWireframeColor.lerpColors(
      this.bondBaseColor,
      this.wireframeDimColor,
      shellMix,
    );
    this.bondMaterial.color.copy(this.scratchWireframeColor);
    this.bondFlowMaterial.color.copy(this.scratchWireframeColor);

    this.decorativeNodes.setChromeColorMix(shellMix);
    for (const atom of this.atoms) {
      atom.setShellColorMix(shellMix);
    }
  }

  private updateAccentWireframePulse(deltaSeconds: number, elapsed: number): void {
    const enterT = 1 - Math.exp(-ACCENT_ENTER_FOLLOW * deltaSeconds);
    this.accentEnterMix +=
      (this.targetAccentEnterMix - this.accentEnterMix) * enterT;

    if (
      this.targetAccentEnterMix === 0 &&
      this.accentEnterMix < 0.015 &&
      this.accentWireframeAtomId
    ) {
      this.accentEnterMix = 0;
      this.accentWireframeAtomId = null;
      this.accentWireframeMode = null;
      this.syncAccentWireframe();
      return;
    }

    if (!this.accentWireframe.visible || !this.accentWireframeMode) return;

    const enter = smoothstep01(this.accentEnterMix);
    if (this.accentWireframeMode === 'static') {
      this.accentWireframeMaterial.opacity = WIREFRAME_OPACITY * enter;
      return;
    }

    const phase = 0.5 + 0.5 * Math.sin(elapsed * PULSE_SPEED);
    const eased = smoothstep01(phase);
    const pulse =
      PULSE_OPACITY_MIN +
      (PULSE_OPACITY_MAX - PULSE_OPACITY_MIN) * eased;
    this.accentWireframeMaterial.opacity = pulse * enter;
  }

  private updateBondFlow(deltaSeconds: number, elapsed: number): void {
    const enterT = 1 - Math.exp(-BOND_FLOW_ENTER_FOLLOW * deltaSeconds);
    this.bondFlowEnterMix +=
      (this.targetBondFlowEnterMix - this.bondFlowEnterMix) * enterT;

    if (
      this.targetBondFlowEnterMix === 0 &&
      this.bondFlowEnterMix < 0.015 &&
      this.bondFlowToAtomId
    ) {
      this.bondFlowEnterMix = 0;
      this.bondFlowToAtomId = null;
      this.setBondFlowDashOffset(0);
      this.syncBondFlowMaterials();
      return;
    }

    if (!this.bondFlowToAtomId || this.bondFlowEnterMix < 0.01) return;

    const period = BOND_DASH_PERIOD;
    const pulseSynced =
      this.accentWireframeMode === 'pulse' &&
      this.accentWireframeAtomId === this.bondFlowToAtomId;

    if (pulseSynced) {
      const cycle = ((elapsed * PULSE_SPEED) / (Math.PI * 2)) * BOND_FLOW_RATE;
      const t = cycle - Math.floor(cycle);
      this.setBondFlowDashOffset((period - t * period + period) % period);
    } else {
      this.setBondFlowDashOffset(
        (this.bondFlowDashOffset - BOND_FLOW_SPEED * deltaSeconds + period) %
          period,
      );
    }

    const enter = smoothstep01(this.bondFlowEnterMix);
    this.bondFlowMaterial.opacity =
      BOND_IDLE_OPACITY + (BOND_FLOW_OPACITY - BOND_IDLE_OPACITY) * enter;
    this.syncBondFlowMaterials();
  }

  private syncBondFlowMaterials(): void {
    const activeToId =
      this.bondFlowToAtomId && this.bondFlowEnterMix > 0.01
        ? this.bondFlowToAtomId
        : null;
    for (const link of this.bondLinks) {
      const isFlow = activeToId !== null && link.toId === activeToId;
      link.bond.setMaterial(isFlow ? this.bondFlowMaterial : this.bondMaterial);
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.clearMolecule();
    this.decorativeNodes.dispose();
    this.tagCloud.dispose();
    this.wireframeMaterial.dispose();
    this.accentWireframeMaterial.dispose();
    this.bondMaterial.dispose();
    this.bondFlowMaterial.dispose();
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

  private syncAccentWireframe(): void {
    const enabled = this.quality.get().selectedWireframe;
    const atom = this.accentWireframeAtomId
      ? this.getAtom(this.accentWireframeAtomId)
      : undefined;
    if (!enabled || !atom || !this.accentWireframeMode) {
      this.accentWireframe.visible = false;
      this.accentWireframe.removeFromParent();
      return;
    }
    if (this.accentWireframe.parent !== atom.object) {
      this.accentWireframe.removeFromParent();
      atom.object.add(this.accentWireframe);
    }
    this.accentWireframe.scale.setScalar(atom.radius * WIREFRAME_SCALE);
    this.accentWireframe.visible = true;
  }

  private clearMolecule(): void {
    this.wireframe.removeFromParent();
    this.wireframe.visible = false;
    this.accentWireframe.removeFromParent();
    this.accentWireframe.visible = false;
    this.accentEnterMix = 0;
    this.targetAccentEnterMix = 0;
    this.bondFlowToAtomId = null;
    this.setBondFlowDashOffset(0);
    this.bondFlowEnterMix = 0;
    this.targetBondFlowEnterMix = 0;
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
