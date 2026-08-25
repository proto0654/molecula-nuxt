import { Matrix4, Quaternion, Vector3 } from 'three';

export type OrbitDef = {
  radius: number;
  /** Plane normal (will be normalized). */
  normal: readonly [number, number, number];
};

/**
 * Two curated orbital planes. Peripheral atoms are placed on these rings
 * so decorative orbits and molecule positions stay in sync.
 */
export const MOLECULE_ORBITS: readonly OrbitDef[] = [
  { radius: 1.28, normal: [0.18, 0.9, 0.4] },
  { radius: 1.55, normal: [0.78, 0.22, -0.58] },
];

/** Angle (rad) of each peripheral atom on its orbit. Hub `C` stays at origin. */
export const ATOM_ORBIT_PLACEMENT: Readonly<
  Record<string, { orbitIndex: number; theta: number }>
> = {
  H1: { orbitIndex: 0, theta: 0.25 },
  H4: { orbitIndex: 0, theta: 2.55 },
  H3: { orbitIndex: 1, theta: 0.9 },
  H2: { orbitIndex: 1, theta: 3.6 },
};

const scratchN = new Vector3();
const scratchTmp = new Vector3();
const scratchU = new Vector3();
const scratchV = new Vector3();
const scratchM = new Matrix4();

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
