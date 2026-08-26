import { Matrix4, Quaternion, Vector3 } from 'three';

export type OrbitDef = {
  radius: number;
  /** Plane normal (will be normalized). Plane passes through the hub. */
  normal: readonly [number, number, number];
};

/** Global phase — rotates the whole spherical constellation for a nicer rest pose. */
const CONSTELLATION_YAW = 0.55;
const CONSTELLATION_PITCH = -0.28;

/**
 * Peripheral atom ids in layout order. Angular spacing is spherical
 * (equal angles about the hub on a sphere), not planar ecliptic.
 * Edit this list to add/remove atoms.
 */
export const PERIPHERAL_ATOM_IDS = ['H1', 'H2', 'H3', 'H4'] as const;

export type PeripheralAtomId = (typeof PERIPHERAL_ATOM_IDS)[number];

/** Varied hub distances — tighter overall, wider spread between atoms. */
export const ATOM_ORBIT_RADIUS: Readonly<Record<PeripheralAtomId, number>> = {
  H1: 0.92,
  H2: 1.28,
  H3: 1.08,
  H4: 1.42,
};

export type AtomOrbitPlacement = {
  /** Unique hub-centered orbit circle for this atom (plane contains the atom). */
  orbit: OrbitDef;
  theta: number;
};

const scratchN = new Vector3();
const scratchTmp = new Vector3();
const scratchU = new Vector3();
const scratchV = new Vector3();
const scratchM = new Matrix4();
const scratchDir = new Vector3();
const scratchYaw = new Quaternion();
const scratchPitch = new Quaternion();
const scratchRot = new Quaternion();
const AXIS_Y = new Vector3(0, 1, 0);
const AXIS_X = new Vector3(1, 0, 0);

/** Orthonormal basis for a plane with the given normal (center at origin). */
export function orbitBasis(
  normal: readonly [number, number, number],
  outU: Vector3,
  outV: Vector3,
  outN: Vector3,
): void {
  outN.set(normal[0], normal[1], normal[2]).normalize();
  if (Math.abs(outN.y) < 0.9) {
    scratchTmp.set(0, 1, 0);
  } else {
    scratchTmp.set(1, 0, 0);
  }
  outU.crossVectors(scratchTmp, outN).normalize();
  outV.crossVectors(outN, outU).normalize();
}

export function pointOnOrbit(
  orbit: OrbitDef,
  theta: number,
): [number, number, number] {
  orbitBasis(orbit.normal, scratchU, scratchV, scratchN);
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [
    orbit.radius * (scratchU.x * c + scratchV.x * s),
    orbit.radius * (scratchU.y * c + scratchV.y * s),
    orbit.radius * (scratchU.z * c + scratchV.z * s),
  ];
}

/** Quaternion mapping unit XY circle → orbit plane (Z → normal). */
export function orbitQuaternion(
  orbit: OrbitDef,
  out: Quaternion = new Quaternion(),
): Quaternion {
  orbitBasis(orbit.normal, scratchU, scratchV, scratchN);
  scratchM.makeBasis(scratchU, scratchV, scratchN);
  return out.setFromRotationMatrix(scratchM);
}

/**
 * Unit directions with equal spherical angular spacing about the hub.
 * Exact polyhedra when available; Fibonacci sphere otherwise.
 */
export function sphericalUnitDirections(count: number): Vector3[] {
  if (count <= 0) return [];
  if (count === 1) return [new Vector3(0, 1, 0)];
  if (count === 2) {
    return [new Vector3(0, 1, 0), new Vector3(0, -1, 0)];
  }
  if (count === 4) {
    // Regular tetrahedron — all pairwise hub angles equal (arccos 1/3).
    const s = 1 / Math.sqrt(3);
    return [
      new Vector3(s, s, s),
      new Vector3(s, -s, -s),
      new Vector3(-s, s, -s),
      new Vector3(-s, -s, s),
    ];
  }
  if (count === 6) {
    return [
      new Vector3(1, 0, 0),
      new Vector3(-1, 0, 0),
      new Vector3(0, 1, 0),
      new Vector3(0, -1, 0),
      new Vector3(0, 0, 1),
      new Vector3(0, 0, -1),
    ];
  }

  // Fibonacci sphere for arbitrary n.
  const dirs: Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = count === 1 ? 0 : 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    dirs.push(new Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).normalize());
  }
  return dirs;
}

/** Unit normal ⊥ direction so the orbit plane contains the atom. */
function orbitNormalForDirection(dir: Vector3): [number, number, number] {
  scratchTmp.set(0, 1, 0);
  if (Math.abs(dir.dot(scratchTmp)) > 0.9) {
    scratchTmp.set(1, 0, 0);
  }
  scratchN.crossVectors(dir, scratchTmp).normalize();
  return [scratchN.x, scratchN.y, scratchN.z];
}

function thetaOnOrbit(orbit: OrbitDef, dir: Vector3): number {
  orbitBasis(orbit.normal, scratchU, scratchV, scratchN);
  return Math.atan2(dir.dot(scratchV), dir.dot(scratchU));
}

/**
 * One orbit per atom: spherical equal angles, varied radii.
 * θ / plane derived so `pointOnOrbit(orbit, theta)` lands on the sphere ray.
 */
export function buildSphericalOrbitPlacements(
  ids: readonly PeripheralAtomId[] = PERIPHERAL_ATOM_IDS,
  radii: Readonly<Record<PeripheralAtomId, number>> = ATOM_ORBIT_RADIUS,
): Readonly<Record<string, AtomOrbitPlacement>> {
  const dirs = sphericalUnitDirections(ids.length);
  scratchYaw.setFromAxisAngle(AXIS_Y, CONSTELLATION_YAW);
  scratchPitch.setFromAxisAngle(AXIS_X, CONSTELLATION_PITCH);
  scratchRot.copy(scratchYaw).multiply(scratchPitch);

  const out: Record<string, AtomOrbitPlacement> = {};
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i]!;
    scratchDir.copy(dirs[i]!).applyQuaternion(scratchRot).normalize();
    const radius = radii[id];
    const normal = orbitNormalForDirection(scratchDir);
    const orbit: OrbitDef = { radius, normal };
    out[id] = {
      orbit,
      theta: thetaOnOrbit(orbit, scratchDir),
    };
  }
  return out;
}

/** @deprecated Use `buildSphericalOrbitPlacements` — name kept for older call sites. */
export const buildEqualOrbitPlacements = buildSphericalOrbitPlacements;

/** One placement per peripheral — each owns its orbit about the hub. */
export const ATOM_ORBIT_PLACEMENT: Readonly<
  Record<string, AtomOrbitPlacement>
> = buildSphericalOrbitPlacements();

/** Orbit defs in peripheral order (one circle per atom). */
export const MOLECULE_ORBITS: readonly OrbitDef[] = PERIPHERAL_ATOM_IDS.map(
  (id) => ATOM_ORBIT_PLACEMENT[id]!.orbit,
);

/** Hub-centered orbit plane normal for a peripheral atom (rest molecule frame). */
export function getOrbitNormalForAtom(
  atomId: string,
  out: Vector3,
): boolean {
  const placement = ATOM_ORBIT_PLACEMENT[atomId];
  if (!placement) return false;
  out
    .set(
      placement.orbit.normal[0],
      placement.orbit.normal[1],
      placement.orbit.normal[2],
    )
    .normalize();
  return true;
}
