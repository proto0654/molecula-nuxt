import {
  Color,
  Group,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Quaternion,
  type Material,
} from 'three';
import {
  ATOM_ORBIT_PLACEMENT,
  PERIPHERAL_ATOM_IDS,
  orbitQuaternion,
  type OrbitDef,
} from './moleculeOrbits';
import type { GeometryCache } from './resources/GeometryCache';

const NODE_COLOR = 0x6a737c;
const ORBIT_COLOR = 0x000000;
/** Active orbit — dark gray, just above black idle. */
const ORBIT_ACTIVE_COLOR = 0x3a3e44;
/** Settled off-home chrome — matches wireframe / reticle dim. */
const ORBIT_DIM_COLOR = 0x4a4f54;

const NODE_OPACITY = 0.18;
const ORBIT_OPACITY = 0.42;
const ORBIT_ACTIVE_OPACITY = 0.55;
const ORBIT_DIM_OPACITY = 0.42;

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
  }

  /** Match decorative rings to compact peripheral layout. */
  setOrbitScale(scale: number): void {
    this.orbitScale = scale;
    for (let i = 0; i < this.orbitLoops.length; i += 1) {
      const def = this.orbitDefs[i]!;
      this.orbitLoops[i]!.scale.setScalar(def.radius * this.orbitScale);
    }
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

  private syncOrbitColors(): void {
    for (let i = 0; i < this.orbitMaterials.length; i += 1) {
      const material = this.orbitMaterials[i]!;
      const active =
        this.chromeColorMix < 0.001 &&
        this.orbitAtomIds[i] === this.activeAtomId;
      const baseHex = active ? ORBIT_ACTIVE_COLOR : ORBIT_COLOR;
      const baseOp = active ? ORBIT_ACTIVE_OPACITY : ORBIT_OPACITY;

      if (this.chromeColorMix < 0.001) {
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
      material.opacity = this.baseOpacities[i]! * this.zoomFade;
    }
  }

  private syncOpacity(): void {
    for (let i = 0; i < this.orbitMaterials.length; i += 1) {
      const material = this.orbitMaterials[i]!;
      material.opacity = this.baseOpacities[i]! * this.zoomFade;
    }
    const nodeMat = this.materials[this.nodeMaterialIndex] as LineBasicMaterial;
    nodeMat.opacity =
      this.baseOpacities[this.nodeMaterialIndex]! * this.zoomFade;
  }

  private syncVisibility(): void {
    const show = this.zoomFade > 0.02;
    for (const orbit of this.orbitLoops) {
      orbit.visible = show && this.orbitsEnabled;
    }
    for (const node of this.ghostNodes) {
      node.visible = show && this.ghostNodesEnabled;
    }
    this.object.visible =
      show && (this.orbitsEnabled || this.ghostNodesEnabled);
  }
}
