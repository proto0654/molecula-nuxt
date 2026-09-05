import {
  type Camera,
  Color,
  Group,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  type Object3D,
} from 'three';
import {
  AtomSelectionIndicator,
  type HaloMode,
} from './AtomSelectionIndicator';
import { AtomLabel } from './AtomLabel';
import type { QualityMaterialKind, QualitySettings } from './quality/types';
import type { GeometryCache } from './resources/GeometryCache';
import { SHELL_DIM_COLOR } from './sceneColors';
import type { AtomConfig } from './types';

const COLOR_BY_LABEL: Record<string, number> = {
  C: 0x3a4048,
  H: 0x25292e,
  O: 0xc0392b,
  N: 0x2f6fed,
};

const SWEEP_SHELL_RELIEF = 0.72;
/** Shell always uses settled off-home dim — no hover/freeze fill changes. */
const FIXED_SHELL_COLOR_MIX = 1;
/** Shadow facets — deeper than scene bg so directional light reads on faces. */
const SHELL_SHADOW_COLOR = 0x020306;
/** Below 1 so lit facets pop; mean tone still tracks scene background. */
const SHELL_EMISSIVE_INTENSITY = 0.62;

export class Atom {
  readonly id: string;
  readonly label: string;
  /** Live radius (may shrink on mobile hub compact layout). */
  radius: number;
  readonly mesh: Mesh;
  readonly atomLabel: AtomLabel;
  readonly selection: AtomSelectionIndicator;
  private readonly group: Group;
  private readonly color: number;
  /** Authored radius before mobile compact scaling. */
  readonly baseRadius: number;
  private readonly basePosition: [number, number, number];
  private material: MeshStandardMaterial | MeshLambertMaterial;
  private shellColorMix = FIXED_SHELL_COLOR_MIX;
  private sweepLightingRelief = 0;
  private readonly baseShellColor = new Color();
  private readonly dimShellColor = new Color(SHELL_DIM_COLOR);
  private readonly shellShadow = new Color(SHELL_SHADOW_COLOR);
  private readonly scratchShellColor = new Color();

  constructor(config: AtomConfig, cache: GeometryCache, settings: QualitySettings) {
    this.id = config.id;
    this.label = config.label;
    this.baseRadius = config.radius;
    this.radius = config.radius;
    this.basePosition = [...config.position];
    this.color = COLOR_BY_LABEL[config.label] ?? 0x2c3036;
    this.baseShellColor.setHex(this.color);

    this.group = new Group();
    this.group.name = `atom-${config.id}`;
    this.group.position.set(...config.position);

    this.material = createAtomMaterial(settings.material, this.color);

    this.mesh = new Mesh(
      cache.getUnitIcosahedron(settings.atomDetail),
      this.material,
    );
    this.mesh.scale.setScalar(config.radius);
    this.mesh.name = `atom-mesh-${config.id}`;
    this.mesh.userData.atomId = config.id;

    this.atomLabel = new AtomLabel(
      config.caption ?? config.label,
      config.radius,
    );

    this.selection = new AtomSelectionIndicator(config.radius, {
      circle: cache.getUnitCircle(),
      ticks: cache.getUnitTicks(),
      cross: cache.getUnitCross(),
    });
    this.applySelectionQuality(settings);

    this.group.add(this.mesh, this.selection.object);
    this.applyShellColor();
  }

  get object(): Object3D {
    return this.group;
  }

  get isHub(): boolean {
    const [x, y, z] = this.basePosition;
    return x * x + y * y + z * z < 1e-12;
  }

  /**
   * Mobile compact layout: tighter orbit; peripherals keep a larger share of radius.
   */
  applyCompactLayout(
    orbitScale: number,
    hubRadiusScale: number,
    peripheralRadiusScale: number,
    hubLabelFontScale = 1,
  ): void {
    const radiusScale = this.isHub ? hubRadiusScale : peripheralRadiusScale;
    this.radius = this.baseRadius * radiusScale;
    this.mesh.scale.setScalar(this.radius);
    this.selection.setRadius(this.radius);
    this.atomLabel.setSurfaceRadius(this.radius);

    if (this.isHub) {
      this.atomLabel.setFontScale(hubLabelFontScale);
      this.group.position.set(0, 0, 0);
      return;
    }

    this.group.position.set(
      this.basePosition[0] * orbitScale,
      this.basePosition[1] * orbitScale,
      this.basePosition[2] * orbitScale,
    );
  }

  applyQuality(settings: QualitySettings, cache: GeometryCache): void {
    this.mesh.geometry = cache.getUnitIcosahedron(settings.atomDetail);
    this.applyMaterialKind(settings.material);
    this.applySelectionQuality(settings);
  }

  setHighlighted(_highlighted: boolean): void {
    // Fixed shell color — hover highlight does not change mesh fill.
  }

  setHaloMode(mode: HaloMode): void {
    this.selection.setMode(mode);
  }

  setSelectionDimmed(dimmed: boolean): void {
    this.selection.setDimmed(dimmed);
  }

  /** No-op — atom fill uses a fixed settled shell color. */
  setShellColorMix(_mix: number): void {}

  /** Temporarily ease chrome dim so sweep point light reads on flat facets. */
  setSweepLightingRelief(relief: number): void {
    const next = Math.max(0, Math.min(1, relief));
    if (Math.abs(next - this.sweepLightingRelief) < 1e-5) return;
    this.sweepLightingRelief = next;
    this.applyShellColor();
  }

  setBlurb(blurb: string | null): void {
    this.atomLabel.setBlurb(blurb);
  }

  setLabelVisible(visible: boolean): void {
    this.atomLabel.setVisible(visible);
  }

  setCaption(caption: string): void {
    this.atomLabel.setCaption(caption);
  }

  updateLabel(camera: Camera): void {
    this.atomLabel.update(camera, this.mesh);
  }

  tickLabelTypewriter(delta: number): void {
    this.atomLabel.tickTypewriter(delta);
  }

  updateSelection(camera: Camera, delta: number, elapsed: number): void {
    this.selection.update(camera, delta, elapsed);
  }

  dispose(): void {
    this.atomLabel.dispose();
    this.selection.dispose();
    this.material.dispose();
  }

  private applySelectionQuality(settings: QualitySettings): void {
    this.selection.setRingCount(settings.selectionRingCount);
    this.selection.setSimple(settings.level === 'low');
    this.selection.setTicksVisible(settings.selectionTicks);
    this.selection.setCenterVisible(settings.level !== 'low');
  }

  private applyMaterialKind(kind: QualityMaterialKind): void {
    const isLambert = this.material instanceof MeshLambertMaterial;
    if (kind === 'lambert' && isLambert) return;
    if (kind === 'standard' && !isLambert) return;

    this.material.dispose();
    this.material = createAtomMaterial(kind, this.color);
    this.mesh.material = this.material;
    this.applyShellColor();
  }

  private applyShellColor(): void {
    // LOW (Lambert): base graphite palette — dim/emissive fill reads flat and dark.
    if (this.material instanceof MeshLambertMaterial) {
      this.material.color.copy(this.baseShellColor);
      this.material.emissive.setHex(0x000000);
      this.material.emissiveIntensity = 0;
      this.material.fog = true;
      return;
    }

    const t =
      this.shellColorMix * (1 - this.sweepLightingRelief * SWEEP_SHELL_RELIEF);
    if (t <= 0.001) {
      this.material.color.copy(this.baseShellColor);
      this.material.emissive.setHex(0x000000);
      this.material.emissiveIntensity = 0;
      this.material.fog = true;
      return;
    }

    this.scratchShellColor.lerpColors(this.baseShellColor, this.shellShadow, t);
    this.material.color.copy(this.scratchShellColor);
    this.scratchShellColor.lerpColors(this.shellShadow, this.dimShellColor, t);
    this.material.emissive.copy(this.scratchShellColor);
    this.material.emissiveIntensity = t * SHELL_EMISSIVE_INTENSITY;
    this.material.fog = t < 0.98;
  }
}

function createAtomMaterial(
  kind: QualityMaterialKind,
  color: number,
): MeshStandardMaterial | MeshLambertMaterial {
  if (kind === 'lambert') {
    return new MeshLambertMaterial({
      color,
      flatShading: true,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
  }

  // Matte graphite — no Fresnel, no metal gloss; facets via flatShading.
  return new MeshStandardMaterial({
    color,
    roughness: 0.94,
    metalness: 0.04,
    flatShading: true,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });
}
