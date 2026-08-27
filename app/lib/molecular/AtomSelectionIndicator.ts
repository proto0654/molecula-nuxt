import {
  Color,
  Group,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Quaternion,
  type BufferGeometry,
  type Camera,
} from 'three';

export type HaloMode = 'idle' | 'hover' | 'committed';

export type SelectionGeometries = {
  circle: BufferGeometry;
  ticks: BufferGeometry;
  cross: BufferGeometry;
};

const RING_COLOR = 0xb8c0c8;
const DIM_COLOR = 0x000000;
const RING_SCALES = [1.28, 1.62, 2.02];
const FOLLOW = 10;
/** Softer than opacity follow — settled freeze chrome fade. */
const COLOR_FOLLOW = 6;
const HOVER_OPACITY = 0.4;
const COMMITTED_OPACITY = 0.32;

/**
 * Screen-flat measurement reticle around an atom (camera billboard).
 * Parent may rotate with the molecule — local quaternion undoes that.
 * Not a raycast target — keep out of `atomMeshes`.
 * Uses shared geometries from `GeometryCache` (do not dispose them).
 */
export class AtomSelectionIndicator {
  readonly object: Group;
  private readonly rings: LineLoop[];
  private readonly ringMaterials: LineBasicMaterial[];
  private readonly ticks: LineSegments;
  private readonly ticksMaterial: LineBasicMaterial;
  private readonly cross: LineSegments;
  private readonly crossMaterial: LineBasicMaterial;
  private radius: number;
  private mode: HaloMode = 'idle';
  private opacity = 0;
  private pulse = 0;
  private targetOpacity = 0;
  private targetPulse = 0;
  private ringCount = RING_SCALES.length;
  private simple = false;
  private ticksEnabled = true;
  private centerEnabled = true;
  private colorMix = 0;
  private targetColorMix = 0;

  private readonly scratchParentQ = new Quaternion();
  private readonly scratchBillboard = new Quaternion();
  private readonly scratchBaseColor = new Color(RING_COLOR);
  private readonly scratchDimColor = new Color(DIM_COLOR);
  private readonly scratchColor = new Color();

  constructor(radius: number, geometries: SelectionGeometries) {
    this.radius = radius;

    this.object = new Group();
    this.object.name = 'atom-selection';
    this.object.raycast = () => {};
    this.object.visible = false;
    this.object.frustumCulled = false;
    this.object.renderOrder = 1;

    this.ringMaterials = RING_SCALES.map(() => {
      return new LineBasicMaterial({
        color: RING_COLOR,
        transparent: true,
        opacity: 0,
        depthTest: true,
        depthWrite: false,
      });
    });

    this.rings = this.ringMaterials.map((material, index) => {
      const line = new LineLoop(geometries.circle, material);
      line.scale.setScalar(this.radius * RING_SCALES[index]!);
      line.raycast = () => {};
      line.frustumCulled = false;
      line.renderOrder = 1;
      this.object.add(line);
      return line;
    });

    this.ticksMaterial = new LineBasicMaterial({
      color: RING_COLOR,
      transparent: true,
      opacity: 0,
      depthTest: true,
      depthWrite: false,
    });
    this.ticks = new LineSegments(geometries.ticks, this.ticksMaterial);
    this.ticks.raycast = () => {};
    this.ticks.frustumCulled = false;
    this.ticks.renderOrder = 1;
    this.object.add(this.ticks);

    this.crossMaterial = new LineBasicMaterial({
      color: RING_COLOR,
      transparent: true,
      opacity: 0,
      depthTest: true,
      depthWrite: false,
    });
    this.cross = new LineSegments(geometries.cross, this.crossMaterial);
    this.cross.scale.setScalar(this.radius);
    this.cross.raycast = () => {};
    this.cross.frustumCulled = false;
    this.cross.renderOrder = 1;
    this.object.add(this.cross);
  }

  get currentMode(): HaloMode {
    return this.mode;
  }

  setMode(mode: HaloMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode === 'idle') {
      this.targetOpacity = 0;
      this.targetPulse = 0;
    } else if (mode === 'hover') {
      this.targetOpacity = HOVER_OPACITY;
      this.targetPulse = 1;
    } else {
      this.targetOpacity = COMMITTED_OPACITY;
      this.targetPulse = 0;
    }
  }

  setRingCount(count: number): void {
    this.ringCount = Math.max(1, Math.min(this.rings.length, count));
    for (let i = 0; i < this.rings.length; i += 1) {
      this.rings[i]!.visible = i < this.ringCount;
    }
  }

  /** LOW: opacity only — no pulse scale wave, no ticks. */
  setSimple(simple: boolean): void {
    this.simple = simple;
  }

  setTicksVisible(visible: boolean): void {
    this.ticksEnabled = visible;
  }

  setCenterVisible(visible: boolean): void {
    this.centerEnabled = visible;
  }

  /**
   * Settled frozen approach: lerp reticle color toward black.
   * Leaving the state sets false and restores `RING_COLOR`.
   */
  setDimmed(dimmed: boolean): void {
    this.targetColorMix = dimmed ? 1 : 0;
  }

  /** Keep rings / ticks sized to the live atom radius (hub compact layout). */
  setRadius(radius: number): void {
    this.radius = Math.max(radius, 1e-6);
    for (let i = 0; i < this.rings.length; i += 1) {
      this.rings[i]!.scale.setScalar(this.radius * RING_SCALES[i]!);
    }
    this.cross.scale.setScalar(this.radius);
  }

  /**
   * Screen-flat billboard (camera quaternion in local space) + pulse / opacity.
   * Skips orientation work when fully idle.
   */
  update(camera: Camera, delta: number, elapsed: number): void {
    const t = 1 - Math.exp(-FOLLOW * delta);
    const colorT = 1 - Math.exp(-COLOR_FOLLOW * delta);
    this.opacity += (this.targetOpacity - this.opacity) * t;
    this.pulse += (this.targetPulse - this.pulse) * t;
    this.colorMix += (this.targetColorMix - this.colorMix) * colorT;
    this.applyColorMix();

    if (this.opacity < 0.01 && this.targetOpacity < 0.01) {
      this.object.visible = false;
      return;
    }

    this.object.visible = true;

    const parent = this.object.parent;
    if (parent) {
      parent.getWorldQuaternion(this.scratchParentQ);
      this.scratchBillboard
        .copy(this.scratchParentQ)
        .invert()
        .multiply(camera.quaternion);
      this.object.quaternion.copy(this.scratchBillboard);
    } else {
      this.object.quaternion.copy(camera.quaternion);
    }

    const showTicks = this.ticksEnabled && !this.simple;
    const showCenter = this.centerEnabled && !this.simple;
    this.ticks.visible = showTicks;
    this.cross.visible = showCenter;

    for (let i = 0; i < this.ringCount; i += 1) {
      const ring = this.rings[i]!;
      const material = this.ringMaterials[i]!;
      if (this.simple) {
        ring.scale.setScalar(this.radius * RING_SCALES[i]!);
        material.opacity = this.opacity * (0.72 - i * 0.16);
        continue;
      }
      const localWave = this.pulse * Math.sin(elapsed * 2.2 + i * 0.85);
      ring.scale.setScalar(
        this.radius * RING_SCALES[i]! * (1 + localWave * 0.03),
      );
      material.opacity =
        this.opacity * (0.72 - i * 0.16) * (1 + localWave * 0.08);
    }

    const innerWave = this.simple
      ? 0
      : this.pulse * Math.sin(elapsed * 2.2);
    const innerScale =
      this.radius * RING_SCALES[0]! * (1 + innerWave * 0.03);
    this.ticks.scale.setScalar(innerScale);
    this.ticksMaterial.opacity = this.opacity * 0.55;
    this.crossMaterial.opacity = this.opacity * 0.7;
  }

  private applyColorMix(): void {
    this.scratchColor.lerpColors(
      this.scratchBaseColor,
      this.scratchDimColor,
      this.colorMix,
    );
    for (const material of this.ringMaterials) {
      material.color.copy(this.scratchColor);
    }
    this.ticksMaterial.color.copy(this.scratchColor);
    this.crossMaterial.color.copy(this.scratchColor);
  }

  dispose(): void {
    for (const material of this.ringMaterials) {
      material.dispose();
    }
    this.ticksMaterial.dispose();
    this.crossMaterial.dispose();
  }
}
