import {
  type Camera,
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
import type { AtomConfig } from './types';

const COLOR_BY_LABEL: Record<string, number> = {
  C: 0x3a4048,
  H: 0x25292e,
  O: 0xc0392b,
  N: 0x2f6fed,
};

const HIGHLIGHT_INTENSITY = 0.1;
const HIGHLIGHT_EMISSIVE = 0x4a525a;

export class Atom {
  readonly id: string;
  readonly label: string;
  readonly radius: number;
  readonly mesh: Mesh;
  readonly atomLabel: AtomLabel;
  readonly selection: AtomSelectionIndicator;
  private readonly group: Group;
  private readonly color: number;
  private material: MeshStandardMaterial | MeshLambertMaterial;
  private highlighted = false;

  constructor(config: AtomConfig, cache: GeometryCache, settings: QualitySettings) {
    this.id = config.id;
    this.label = config.label;
    this.radius = config.radius;
    this.color = COLOR_BY_LABEL[config.label] ?? 0x2c3036;

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
  }

  get object(): Object3D {
    return this.group;
  }

  applyQuality(settings: QualitySettings, cache: GeometryCache): void {
    this.mesh.geometry = cache.getUnitIcosahedron(settings.atomDetail);
    this.applyMaterialKind(settings.material);
    this.applySelectionQuality(settings);
  }

  setHighlighted(highlighted: boolean): void {
    if (this.highlighted === highlighted) return;
    this.highlighted = highlighted;
    this.applyHighlight();
  }

  setHaloMode(mode: HaloMode): void {
    this.selection.setMode(mode);
  }

  setBlurb(blurb: string | null): void {
    this.atomLabel.setBlurb(blurb);
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
    this.applyHighlight();
  }

  private applyHighlight(): void {
    if (this.highlighted) {
      this.material.emissive.setHex(HIGHLIGHT_EMISSIVE);
      this.material.emissiveIntensity = HIGHLIGHT_INTENSITY;
      return;
    }
    this.material.emissive.setHex(0x000000);
    this.material.emissiveIntensity = 0;
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
