import {
  Group,
  Quaternion,
  Vector3,
  type Camera,
  type Material,
  type Object3D,
} from 'three';
import { Text } from 'troika-three-text';
import { getLabelFontUrl } from './AtomLabel';
import { sphericalUnitDirections } from './moleculeOrbits';

export type TagCloudItem = {
  label: string;
  tier: 'primary' | 'secondary';
};

/** Muted grays — tier via color only; below atom-label ink. */
const COLOR_PRIMARY = 0x585f67;
const COLOR_SECONDARY = 0x424950;
const COLOR_MOBILE = 0x000000;
const FONT_PRIMARY = 0.072;
const FONT_SECONDARY = 0.038;
/** Match AtomLabel — constant screen size, stable SDF rasterization. */
const REF_DISTANCE = 4.5;
/** Same band as atom orbits (0.92–1.42) — hugs the molecule, not a far halo. */
const RADIUS_MIN = 0.95;
const RADIUS_MAX = 1.38;
/** Extra pose so the cloud is not locked to the atom tetrahedron. */
const CLOUD_YAW = 1.15;
const CLOUD_PITCH = 0.42;

const AXIS_Y = new Vector3(0, 1, 0);
const AXIS_X = new Vector3(1, 0, 0);

type TagEntry = {
  local: Vector3;
  object: Group;
  text: Text;
  tier: TagCloudItem['tier'];
};

function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/** Deterministic shuffle so CMS order (primaries first) does not cluster on one hemisphere. */
function shuffledIndices(items: readonly TagCloudItem[]): number[] {
  const idx = items.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i -= 1) {
    const item = items[i]!;
    const j = Math.floor(hash01(`${item.label}:${i}`) * (i + 1));
    const tmp = idx[i]!;
    idx[i] = idx[j]!;
    idx[j] = tmp;
  }
  return idx;
}

function hardenTextMaterial(text: Text): void {
  const material = text.material as Material;
  // Troika SDF glyphs need alpha for anti-aliasing — opaque flag causes z-fighting / doubling.
  material.transparent = true;
  material.depthWrite = false;
}

/**
 * Decorative Troika tags around the molecule. Scene-parented (not moleculeGroup)
 * so glyph billboards stay screen-flat. Positions ride molecule rotation via
 * localToWorld. Never pickable.
 */
export class TagCloud {
  readonly object: Group;
  private readonly tags: TagEntry[] = [];
  private layoutScale = 1;
  private zoomFade = 1;
  private mobileInk = false;
  private readonly scratchWorld = new Vector3();
  private readonly scratchLocal = new Vector3();
  private readonly scratchCamera = new Vector3();
  private readonly scratchYaw = new Quaternion();
  private readonly scratchPitch = new Quaternion();
  private readonly scratchRot = new Quaternion();

  constructor() {
    this.object = new Group();
    this.object.name = 'tag-cloud';
    this.object.raycast = () => {};
  }

  /** Match compact mobile layout — black ink instead of muted gray. */
  setMobileInk(mobile: boolean): void {
    if (this.mobileInk === mobile) return;
    this.mobileInk = mobile;
    this.applyColors();
  }

  setTags(items: readonly TagCloudItem[]): void {
    this.clear();
    if (items.length === 0) {
      this.syncVisibility();
      return;
    }

    const dirs = sphericalUnitDirections(items.length);
    this.scratchYaw.setFromAxisAngle(AXIS_Y, CLOUD_YAW);
    this.scratchPitch.setFromAxisAngle(AXIS_X, CLOUD_PITCH);
    this.scratchRot.copy(this.scratchYaw).multiply(this.scratchPitch);

    const order = shuffledIndices(items);
    const font = getLabelFontUrl();

    for (let k = 0; k < items.length; k += 1) {
      const item = items[order[k]!]!;
      const dir = dirs[k]!.clone().applyQuaternion(this.scratchRot).normalize();
      const t = hash01(`${item.label}:${order[k]}`);
      const radius = RADIUS_MIN + (RADIUS_MAX - RADIUS_MIN) * t;
      const local = dir.multiplyScalar(radius);
      const primary = item.tier === 'primary';

      const text = new Text();
      text.name = `tag-cloud-${item.label}`;
      text.text = item.label;
      text.font = font;
      text.fontSize = primary ? FONT_PRIMARY : FONT_SECONDARY;
      text.color = this.colorForTier(item.tier);
      text.fillOpacity = 1;
      text.anchorX = 'center';
      text.anchorY = 'middle';
      text.raycast = () => {};
      text.frustumCulled = false;
      text.sync(() => hardenTextMaterial(text));

      const object = new Group();
      object.name = `tag-cloud-wrap-${item.label}`;
      object.raycast = () => {};
      object.frustumCulled = false;
      object.add(text);

      this.object.add(object);
      this.tags.push({ local, object, text, tier: item.tier });
    }

    this.syncVisibility();
  }

  /** Match compact peripheral layout — positions only, glyph size stays world-space. */
  setLayoutScale(scale: number): void {
    this.layoutScale = scale;
  }

  setZoomFade(zoom: number, fill: number): void {
    const t = Math.max(0, Math.min(1, Math.max(zoom, fill)));
    this.zoomFade = 1 - t;
    this.syncVisibility();
  }

  update(camera: Camera, moleculeGroup: Object3D): void {
    if (!this.object.visible) return;
    camera.getWorldPosition(this.scratchCamera);
    for (const tag of this.tags) {
      this.scratchLocal.copy(tag.local).multiplyScalar(this.layoutScale);
      this.scratchWorld.copy(this.scratchLocal);
      moleculeGroup.localToWorld(this.scratchWorld);
      tag.object.position.copy(this.scratchWorld);
      tag.object.quaternion.copy(camera.quaternion);
      const distance = this.scratchCamera.distanceTo(this.scratchWorld);
      tag.object.scale.setScalar(distance / REF_DISTANCE);
    }
  }

  dispose(): void {
    this.clear();
  }

  private syncVisibility(): void {
    this.object.visible = this.tags.length > 0 && this.zoomFade > 0.02;
  }

  private colorForTier(tier: TagCloudItem['tier']): number {
    if (this.mobileInk) return COLOR_MOBILE;
    return tier === 'primary' ? COLOR_PRIMARY : COLOR_SECONDARY;
  }

  private applyColors(): void {
    for (const tag of this.tags) {
      tag.text.color = this.colorForTier(tag.tier);
      tag.text.sync();
    }
  }

  private clear(): void {
    for (const tag of this.tags) {
      this.object.remove(tag.object);
      tag.text.dispose();
    }
    this.tags.length = 0;
  }
}
