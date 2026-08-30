import {
  BufferAttribute,
  BufferGeometry,
  EdgesGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
} from 'three';

const CIRCLE_SEGMENTS = 64;

/**
 * Shared unit geometries. Callers must not dispose returned objects;
 * `dispose()` on the cache at scene teardown.
 */
export class GeometryCache {
  private readonly icosahedrons = new Map<number, IcosahedronGeometry>();
  private readonly icosahedronEdges = new Map<number, EdgesGeometry>();
  private octahedronEdges: EdgesGeometry | null = null;
  private circle: BufferGeometry | null = null;
  private ticks: BufferGeometry | null = null;
  private cross: BufferGeometry | null = null;

  getUnitIcosahedron(detail: number): IcosahedronGeometry {
    let geometry = this.icosahedrons.get(detail);
    if (!geometry) {
      geometry = new IcosahedronGeometry(1, detail);
      this.icosahedrons.set(detail, geometry);
    }
    return geometry;
  }

  getUnitIcosahedronEdges(detail: number): EdgesGeometry {
    let geometry = this.icosahedronEdges.get(detail);
    if (!geometry) {
      geometry = new EdgesGeometry(this.getUnitIcosahedron(detail));
      this.icosahedronEdges.set(detail, geometry);
    }
    return geometry;
  }

  /** Lighter wire shell for decorative ghost fragments (12 edges vs icosahedron ~30). */
  getUnitOctahedronEdges(): EdgesGeometry {
    if (!this.octahedronEdges) {
      this.octahedronEdges = new EdgesGeometry(new OctahedronGeometry(1, 0));
    }
    return this.octahedronEdges;
  }

  getUnitCircle(): BufferGeometry {
    if (!this.circle) {
      const positions = new Float32Array(CIRCLE_SEGMENTS * 3);
      for (let i = 0; i < CIRCLE_SEGMENTS; i += 1) {
        const angle = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
        positions[i * 3] = Math.cos(angle);
        positions[i * 3 + 1] = Math.sin(angle);
        positions[i * 3 + 2] = 0;
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      this.circle = geometry;
    }
    return this.circle;
  }

  /** Four short radial ticks on the unit circle (XY), for selection reticle. */
  getUnitTicks(): BufferGeometry {
    if (!this.ticks) {
      const inner = 0.92;
      const outer = 1.14;
      const positions = new Float32Array(4 * 2 * 3);
      for (let i = 0; i < 4; i += 1) {
        const angle = (i / 4) * Math.PI * 2;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const o = i * 6;
        positions[o] = c * inner;
        positions[o + 1] = s * inner;
        positions[o + 2] = 0;
        positions[o + 3] = c * outer;
        positions[o + 4] = s * outer;
        positions[o + 5] = 0;
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      this.ticks = geometry;
    }
    return this.ticks;
  }

  /** Small + at the origin (XY). */
  getUnitCross(): BufferGeometry {
    if (!this.cross) {
      const s = 0.14;
      const positions = new Float32Array([
        -s, 0, 0, s, 0, 0, 0, -s, 0, 0, s, 0,
      ]);
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      this.cross = geometry;
    }
    return this.cross;
  }

  dispose(): void {
    for (const geometry of this.icosahedronEdges.values()) {
      geometry.dispose();
    }
    this.icosahedronEdges.clear();
    for (const geometry of this.icosahedrons.values()) {
      geometry.dispose();
    }
    this.icosahedrons.clear();
    this.octahedronEdges?.dispose();
    this.octahedronEdges = null;
    this.circle?.dispose();
    this.circle = null;
    this.ticks?.dispose();
    this.ticks = null;
    this.cross?.dispose();
    this.cross = null;
  }
}

