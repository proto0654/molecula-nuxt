import {
  Group,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Quaternion,
  type Material,
} from 'three';
import { MOLECULE_ORBITS, orbitQuaternion } from './moleculeOrbits';
import type { GeometryCache } from './resources/GeometryCache';

const NODE_COLOR = 0x6a737c;
const ORBIT_COLOR = 0x5c656e;

const NODE_OPACITY = 0.18;
const ORBIT_OPACITY = 0.14;

/**
 * Optional HIGH-only ghost geometry. Parent under `moleculeGroup`
 * so it rides molecule rotation. Never added to `atomMeshes`.
 *
 * Orbits share the same plane/radius as peripheral atom placements
 * (`moleculeOrbits.ts`) so atoms sit on the rings.
 */
export class DecorativeNodes {
  readonly object: Group;
  private readonly materials: Material[];
  private readonly baseOpacities: number[];
  private readonly orbitLoops: LineLoop[] = [];
  private enabled = true;
  private zoomFade = 1;
  private orbitScale = 1;
  private readonly scratchQ = new Quaternion();

  constructor(cache: GeometryCache) {
    this.object = new Group();
    this.object.name = 'decorative-nodes';

    const materials: Material[] = [];
    const baseOpacities: number[] = [];

    const orbitMaterial = new LineBasicMaterial({
      color: ORBIT_COLOR,
      transparent: true,
      opacity: ORBIT_OPACITY,
      depthWrite: false,
    });
    materials.push(orbitMaterial);
    baseOpacities.push(ORBIT_OPACITY);

    for (let i = 0; i < MOLECULE_ORBITS.length; i += 1) {
      const def = MOLECULE_ORBITS[i]!;
      const orbit = new LineLoop(cache.getUnitCircle(), orbitMaterial);
      orbit.name = `decorative-orbit-${i}`;
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
    materials.push(nodeMaterial);
    baseOpacities.push(NODE_OPACITY);

    const node = new LineSegments(
      cache.getUnitIcosahedronEdges(0),
      nodeMaterial,
    );
    node.name = 'decorative-node';
    node.scale.setScalar(0.05);
    // Off the main orbits — faint technical fragment, not a half-arc.
    node.position.set(0.15, 1.72, -0.55);
    node.raycast = () => {};
    this.object.add(node);

    this.materials = materials;
    this.baseOpacities = baseOpacities;
  }

  /** Match decorative rings to compact peripheral layout. */
  setOrbitScale(scale: number): void {
    this.orbitScale = scale;
    for (let i = 0; i < this.orbitLoops.length; i += 1) {
      const def = MOLECULE_ORBITS[i]!;
      this.orbitLoops[i]!.scale.setScalar(def.radius * this.orbitScale);
    }
  }

  setVisible(visible: boolean): void {
    this.enabled = visible;
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

  private syncOpacity(): void {
    for (let i = 0; i < this.materials.length; i += 1) {
      const material = this.materials[i] as LineBasicMaterial;
      material.opacity = this.baseOpacities[i]! * this.zoomFade;
    }
  }

  private syncVisibility(): void {
    this.object.visible = this.enabled && this.zoomFade > 0.02;
  }
}
