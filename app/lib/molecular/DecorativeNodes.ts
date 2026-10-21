import {
  Color,
  Group,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Quaternion,
  Vector3,
  type Material,
} from 'three';
import {
  ATOM_ORBIT_PLACEMENT,
  PERIPHERAL_ATOM_IDS,
  orbitQuaternion,
  orbitQuaternionFromNormal,
  type OrbitDef,
} from './moleculeOrbits';
import type { GeometryCache } from './resources/GeometryCache';
import { CHROME_DIM_COLOR } from './sceneColors';

const NODE_COLOR = 0x6a737c;
const ORBIT_COLOR = 0x000000;
/** Active orbit — dark gray, just above black idle. */
const ORBIT_ACTIVE_COLOR = 0x3a3e44;
/** Settled off-home chrome — matches wireframe / reticle dim. */
const ORBIT_DIM_COLOR = CHROME_DIM_COLOR;

const NODE_OPACITY = 0.18;
const ORBIT_OPACITY = 0.42;
const ORBIT_ACTIVE_OPACITY = 0.55;
const ORBIT_DIM_OPACITY = 0.42;
const TAU = Math.PI * 2;
/** Home boot: extra full turns a ring makes while unfolding into its pose. */
const UNFOLD_TURNS = 1;
/** Share of an orbit's unfold spent fading in from transparency. */
const UNFOLD_FADE = 0.14;
/** Normal / view sine below this means they are parallel — no unique start. */
const UNFOLD_PARALLEL = 0.08;

/** Extra ghost fragments that ride with the molecule (not pick targets). */
const EXTRA_NODES: readonly {
  position: readonly [number, number, number];
  scale: number;
}[] = [
  { position: [0.15, 1.72, -0.55], scale: 0.05 },
  { position: [-1.35, -0.55, 0.85], scale: 0.04 },
  { position: [1.1, 0.95, 1.05], scale: 0.035 },
];

/**
 * Decorative orbit rings + optional ghost wire fragments.
 * Parent under `moleculeGroup` so it rides molecule rotation.
 * Never added to `atomMeshes`.
 *
 * One hub-centered orbit circle per peripheral atom (varied radius).
 * Idle orbits are black; the active atom's orbit turns dark gray.
 */
export class DecorativeNodes {
  readonly object: Group;
  private readonly materials: Material[];
  private readonly baseOpacities: number[];
  private readonly orbitLoops: LineLoop[] = [];
  private readonly orbitMaterials: LineBasicMaterial[] = [];
  private readonly orbitAtomIds: string[] = [];
  private readonly orbitDefs: OrbitDef[] = [];
  private readonly ghostNodes: LineSegments[] = [];
  private readonly nodeMaterialIndex: number;
  private orbitsEnabled = true;
  private ghostNodesEnabled = false;
  private zoomFade = 1;
  private orbitScale = 1;
  /**
   * Home boot: per-orbit unfold 0..1 in peripheral order. A ring starts as an
   * edge-on line (normal ⊥ view) and tumbles into its authored plane; 1 at rest.
   */
  private readonly unfoldProgress: number[] = [];
  private readonly unfoldStart: Vector3[] = [];
  private readonly unfoldAxis: Vector3[] = [];
  private readonly unfoldAngle: number[] = [];
  private readonly unfoldView = new Vector3(0, 0, 1);
  private readonly scratchNormal = new Vector3();
  private readonly scratchTangent = new Vector3();
  private readonly scratchFinalNormal = new Vector3();
  private unfoldPrepared = false;
  private activeAtomId: string | null = null;
  private chromeColorMix = 0;
  private readonly scratchOrbitBase = new Color();
  private readonly scratchOrbitDim = new Color(ORBIT_DIM_COLOR);
  private readonly scratchOrbitOut = new Color();
  private readonly scratchQ = new Quaternion();

  constructor(cache: GeometryCache) {
    this.object = new Group();
    this.object.name = 'decorative-nodes';

    const materials: Material[] = [];
    const baseOpacities: number[] = [];

    for (const atomId of PERIPHERAL_ATOM_IDS) {
      const placement = ATOM_ORBIT_PLACEMENT[atomId]!;
      const def = placement.orbit;
      this.orbitDefs.push(def);
      this.orbitAtomIds.push(atomId);

      const orbitMaterial = new LineBasicMaterial({
        color: ORBIT_COLOR,
        transparent: true,
        opacity: ORBIT_OPACITY,
        depthWrite: false,
      });
      materials.push(orbitMaterial);
      baseOpacities.push(ORBIT_OPACITY);
      this.orbitMaterials.push(orbitMaterial);

      const orbit = new LineLoop(cache.getUnitCircle(), orbitMaterial);
      orbit.name = `decorative-orbit-${atomId}`;
      orbit.scale.setScalar(def.radius);
      orbit.quaternion.copy(orbitQuaternion(def, this.scratchQ));
      orbit.raycast = () => {};
      this.orbitLoops.push(orbit);
      this.object.add(orbit);
    }

    const nodeMaterial = new LineBasicMaterial({
      color: NODE_COLOR,
      transparent: true,
      opacity: NODE_OPACITY,
      depthWrite: false,
    });
    this.nodeMaterialIndex = materials.length;
    materials.push(nodeMaterial);
    baseOpacities.push(NODE_OPACITY);

    for (let i = 0; i < EXTRA_NODES.length; i += 1) {
      const spec = EXTRA_NODES[i]!;
      const node = new LineSegments(
        cache.getUnitOctahedronEdges(),
        nodeMaterial,
      );
      node.name = i === 0 ? 'decorative-node' : `decorative-node-${i}`;
      node.scale.setScalar(spec.scale);
      node.position.set(spec.position[0], spec.position[1], spec.position[2]);
      node.raycast = () => {};
      this.ghostNodes.push(node);
      this.object.add(node);
    }

    this.materials = materials;
    this.baseOpacities = baseOpacities;

    for (let i = 0; i < this.orbitLoops.length; i += 1) {
      this.unfoldProgress.push(1);
      this.unfoldStart.push(new Vector3());
      this.unfoldAxis.push(new Vector3());
      this.unfoldAngle.push(0);
    }
  }

  /** Match decorative rings to compact peripheral layout. */
  setOrbitScale(scale: number): void {
    this.orbitScale = scale;
    this.applyOrbitPose();
  }

  /**
   * Home boot: unfold every ring from an edge-on line into its authored plane.
   * `progress` is per orbit in peripheral order (see `PERIPHERAL_ATOM_IDS`).
   * `viewLocal` is the camera direction in the molecule frame; it is captured
   * once, so the tumble path stays stable while the framing drifts.
   */
  setOrbitUnfold(progress: readonly number[], viewLocal: Vector3): void {
    if (!this.unfoldPrepared) this.prepareUnfold(viewLocal);
    let changed = false;
    for (let i = 0; i < this.orbitLoops.length; i += 1) {
      const next = Math.max(0, Math.min(1, progress[i] ?? 1));
      if (Math.abs(next - this.unfoldProgress[i]!) < 1e-4) continue;
      this.unfoldProgress[i] = next;
      changed = true;
    }
    if (!changed) return;
    this.applyOrbitPose();
    this.syncOrbitColors();
    this.syncVisibility();
  }

  /** Hand the rings back to their authored pose (boot finished / disposed). */
  resetOrbitUnfold(): void {
    this.unfoldPrepared = false;
    for (let i = 0; i < this.orbitLoops.length; i += 1) {
      this.unfoldProgress[i] = 1;
    }
    this.applyOrbitPose();
    this.syncOrbitColors();
    this.syncVisibility();
  }

  /** White orbit for the active peripheral; others stay black. */
  setActiveOrbitAtom(atomId: string | null): void {
    if (atomId === this.activeAtomId) return;
    this.activeAtomId = atomId;
    this.syncOrbitColors();
  }

  /** Lerp all orbit rings toward settled dim chrome (0 = home palette). */
  setChromeColorMix(mix: number): void {
    const next = Math.max(0, Math.min(1, mix));
    if (Math.abs(next - this.chromeColorMix) < 1e-5) return;
    this.chromeColorMix = next;
    this.syncOrbitColors();
  }

  applyQuality(options: {
    orbits: boolean;
    ghostNodes: boolean;
  }): void {
    this.orbitsEnabled = options.orbits;
    this.ghostNodesEnabled = options.ghostNodes;
    this.syncVisibility();
  }

  setZoomFade(zoom: number, fill: number): void {
    const t = Math.max(0, Math.min(1, Math.max(zoom, fill)));
    this.zoomFade = 1 - t;
    this.syncOpacity();
    this.syncVisibility();
  }

  dispose(): void {
    for (const material of this.materials) {
      material.dispose();
    }
    this.materials.length = 0;
  }

  private applyOrbitPose(): void {
    for (let i = 0; i < this.orbitLoops.length; i += 1) {
      const orbit = this.orbitLoops[i]!;
      const def = this.orbitDefs[i]!;
      orbit.scale.setScalar(def.radius * this.orbitScale);
      const progress = this.unfoldProgress[i]!;
      if (progress >= 1) {
        orbitQuaternion(def, this.scratchQ);
      } else {
        // Rotate the normal off its edge-on start by a couple of full turns
        // plus the shortest arc: the ring sweeps past the viewer twice.
        const angle =
          (this.unfoldAngle[i]! + UNFOLD_TURNS * TAU) * progress;
        const normal = this.scratchNormal
          .copy(this.unfoldStart[i]!)
          .multiplyScalar(Math.cos(angle));
        this.scratchTangent.crossVectors(
          this.unfoldAxis[i]!,
          this.unfoldStart[i]!,
        );
        normal.addScaledVector(this.scratchTangent, Math.sin(angle));
        orbitQuaternionFromNormal(normal, this.scratchQ);
      }
      orbit.quaternion.copy(this.scratchQ);
    }
  }

  /** Capture each ring's edge-on start normal and its tumble axis, once. */
  private prepareUnfold(viewLocal: Vector3): void {
    this.unfoldPrepared = true;
    this.unfoldView.copy(viewLocal).normalize();
    for (let i = 0; i < this.orbitDefs.length; i += 1) {
      const def = this.orbitDefs[i]!;
      const final = this.scratchFinalNormal
        .set(def.normal[0], def.normal[1], def.normal[2])
        .normalize();
      const start = this.unfoldStart[i]!;
      start.crossVectors(this.unfoldView, final);
      if (start.length() < UNFOLD_PARALLEL) {
        // Authored plane already contains the view axis: any edge-on start.
        const ref =
          Math.abs(this.unfoldView.y) > 0.9
            ? this.scratchNormal.set(1, 0, 0)
            : this.scratchNormal.set(0, 1, 0);
        start.crossVectors(this.unfoldView, ref);
      }
      start.normalize();
      const axis = this.unfoldAxis[i]!;
      axis.crossVectors(start, final);
      if (axis.lengthSq() < 1e-8) axis.crossVectors(start, this.unfoldView);
      if (axis.lengthSq() < 1e-8) axis.set(0, 1, 0);
      axis.normalize();
      this.unfoldAngle[i] = Math.acos(
        Math.max(-1, Math.min(1, start.dot(final))),
      );
    }
  }

  /** 0..1 opacity factor of one ring during the boot unfold. */
  private orbitRevealAt(index: number): number {
    const progress = this.unfoldProgress[index]!;
    if (progress >= UNFOLD_FADE) return 1;
    const t = progress / UNFOLD_FADE;
    return t * t * (3 - 2 * t);
  }

  /** Ghost fragments arrive with the first ring, so they share its gate. */
  private ghostReveal(): number {
    let max = 0;
    for (let i = 0; i < this.unfoldProgress.length; i += 1) {
      max = Math.max(max, this.unfoldProgress[i]!);
    }
    return max;
  }

  private syncOrbitColors(): void {
    for (let i = 0; i < this.orbitMaterials.length; i += 1) {
      const material = this.orbitMaterials[i]!;
      const isActiveOrbit = this.orbitAtomIds[i] === this.activeAtomId;
      const baseHex = isActiveOrbit ? ORBIT_ACTIVE_COLOR : ORBIT_COLOR;
      const baseOp = isActiveOrbit ? ORBIT_ACTIVE_OPACITY : ORBIT_OPACITY;

      if (this.chromeColorMix < 0.001 || !isActiveOrbit) {
        material.color.setHex(baseHex);
        this.baseOpacities[i] = baseOp;
      } else {
        this.scratchOrbitBase.setHex(baseHex);
        this.scratchOrbitOut.lerpColors(
          this.scratchOrbitBase,
          this.scratchOrbitDim,
          this.chromeColorMix,
        );
        material.color.copy(this.scratchOrbitOut);
        this.baseOpacities[i] =
          baseOp + (ORBIT_DIM_OPACITY - baseOp) * this.chromeColorMix;
      }
      material.opacity = this.baseOpacities[i]! * this.zoomFade * this.orbitRevealAt(i);
    }
  }

  private syncOpacity(): void {
    for (let i = 0; i < this.orbitMaterials.length; i += 1) {
      const material = this.orbitMaterials[i]!;
      material.opacity =
        this.baseOpacities[i]! * this.zoomFade * this.orbitRevealAt(i);
    }
    const nodeMat = this.materials[this.nodeMaterialIndex] as LineBasicMaterial;
    nodeMat.opacity =
      this.baseOpacities[this.nodeMaterialIndex]! *
      this.zoomFade *
      this.ghostReveal();
  }

  private syncVisibility(): void {
    const zoom = this.zoomFade > 0.02;
    let anyOrbit = false;
    for (let i = 0; i < this.orbitLoops.length; i += 1) {
      const visible =
        zoom && this.orbitsEnabled && this.orbitRevealAt(i) > 0.02;
      this.orbitLoops[i]!.visible = visible;
      anyOrbit = anyOrbit || visible;
    }
    const ghosts = zoom && this.ghostNodesEnabled && this.ghostReveal() > 0.02;
    for (const node of this.ghostNodes) {
      node.visible = ghosts;
    }
    this.object.visible = anyOrbit || ghosts;
  }
}
