import {
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineLoop,
  type Camera,
  Vector3,
} from 'three';

export type HaloMode = 'idle' | 'hover' | 'committed';

const RING_SEGMENTS = 64;
const RING_COLOR = 0xd6dbe0;
const RING_SCALES = [1.28, 1.62, 2.02];
const FOLLOW = 10;

function createUnitCircle(): BufferGeometry {
  const positions = new Float32Array(RING_SEGMENTS * 3);
  for (let i = 0; i < RING_SEGMENTS; i += 1) {
    const angle = (i / RING_SEGMENTS) * Math.PI * 2;
    positions[i * 3] = Math.cos(angle);
    positions[i * 3 + 1] = Math.sin(angle);
    positions[i * 3 + 2] = 0;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  return geometry;
}

/**
 * Billboarded concentric rings around an atom.
 * Not a raycast target — keep out of `atomMeshes`.
 */
export class AtomHalo {
  readonly object: Group;
  private readonly rings: LineLoop[];
  private readonly materials: LineBasicMaterial[];
  private readonly geometry: BufferGeometry;
  private readonly radius: number;
  private mode: HaloMode = 'idle';
  private opacity = 0;
  private pulse = 0;
  private targetOpacity = 0;
  private targetPulse = 0;

  private readonly scratchCamera = new Vector3();

  constructor(radius: number) {
    this.radius = radius;
    this.geometry = createUnitCircle();

    this.object = new Group();
    this.object.name = 'atom-halo';
    this.object.raycast = () => {};
    this.object.visible = false;
    this.object.frustumCulled = false;
    this.object.renderOrder = 1;

    this.materials = RING_SCALES.map(() => {
      return new LineBasicMaterial({
        color: RING_COLOR,
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
      });
    });

    this.rings = this.materials.map((material, index) => {
      const line = new LineLoop(this.geometry, material);
      line.scale.setScalar(this.radius * RING_SCALES[index]!);
      line.raycast = () => {};
      line.frustumCulled = false;
      line.renderOrder = 1;
      this.object.add(line);
      return line;
    });
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
      this.targetOpacity = 0.55;
      this.targetPulse = 1;
    } else {
      this.targetOpacity = 0.42;
      this.targetPulse = 0;
    }
  }

  /**
   * Billboards the rings and damps pulse / opacity.
   * Call every frame (pulse needs time even when orientation is settled).
   */
  update(camera: Camera, delta: number, elapsed: number): void {
    const t = 1 - Math.exp(-FOLLOW * delta);
    this.opacity += (this.targetOpacity - this.opacity) * t;
    this.pulse += (this.targetPulse - this.pulse) * t;

    if (this.opacity < 0.01 && this.targetOpacity < 0.01) {
      this.object.visible = false;
      return;
    }

    this.object.visible = true;
    camera.getWorldPosition(this.scratchCamera);
    this.object.lookAt(this.scratchCamera);

    for (let i = 0; i < this.rings.length; i += 1) {
      const ring = this.rings[i]!;
      const material = this.materials[i]!;
      const localWave = this.pulse * Math.sin(elapsed * 3.2 + i * 0.85);
      ring.scale.setScalar(
        this.radius * RING_SCALES[i]! * (1 + localWave * 0.055),
      );
      material.opacity =
        this.opacity * (0.85 - i * 0.18) * (1 + localWave * 0.12);
    }
  }

  dispose(): void {
    for (const material of this.materials) {
      material.dispose();
    }
    this.geometry.dispose();
  }
}
