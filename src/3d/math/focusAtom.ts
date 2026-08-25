import { Matrix4, Quaternion, Vector3, type Vector3Like } from 'three';

const _atomDir = new Vector3();
const _cameraDir = new Vector3();

const _fromF = new Vector3();
const _fromR = new Vector3();
const _fromU = new Vector3();
const _toF = new Vector3();
const _toR = new Vector3();
const _toU = new Vector3();

const _preferredLocalUp = new Vector3();
const _preferredWorldUp = new Vector3();
const _fallbackUp = new Vector3();

const _fromMatrix = new Matrix4();
const _toMatrix = new Matrix4();
const _rotMatrix = new Matrix4();

const _axisX = new Vector3(1, 0, 0);
const _axisY = new Vector3(0, 1, 0);
const _axisZ = new Vector3(0, 0, 1);

/** |dot| above this ⇒ vectors are treated as nearly parallel. */
const PARALLEL_DOT = 0.999;

/**
 * Picks a unit up hint that is not parallel to `forward`, so
 * `cross(up, forward)` yields a usable right axis.
 *
 * Preference order: +Y (molecule “up”), then +X, then +Z.
 */
function pickPreferredUp(forward: Vector3, out: Vector3): Vector3 {
  // Smallest |dot| among fixed axes → most perpendicular → most stable cross.
  let best = _axisY;
  let bestScore = Math.abs(_axisY.dot(forward));

  const scoreX = Math.abs(_axisX.dot(forward));
  if (scoreX < bestScore) {
    best = _axisX;
    bestScore = scoreX;
  }

  const scoreZ = Math.abs(_axisZ.dot(forward));
  if (scoreZ < bestScore) {
    best = _axisZ;
  }

  return out.copy(best);
}

/**
 * Builds a right-handed orthonormal frame with +Z = `forward`.
 *
 *   right = normalize(upHint × forward)   // +X
 *   up    = forward × right               // +Y (re-orthogonalized)
 *   forward                               // +Z
 *
 * If `upHint ∥ forward`, a fallback axis is chosen automatically.
 */
function buildBasisFromForward(
  forward: Vector3,
  upHint: Vector3,
  outRight: Vector3,
  outUp: Vector3,
): void {
  // right ⟂ upHint and forward → lies in the plane ⊥ forward.
  outRight.crossVectors(upHint, forward);

  // Degenerate when upHint ≈ ±forward: cross ≈ 0, pick another up hint.
  if (outRight.lengthSq() < 1e-12) {
    pickPreferredUp(forward, _fallbackUp);
    outRight.crossVectors(_fallbackUp, forward);
  }

  outRight.normalize();

  // Re-orthogonalize up so {right, up, forward} is orthonormal RH.
  outUp.crossVectors(forward, outRight);
}

/**
 * Quaternion that maps rest-frame atom direction → camera direction,
 * with twist about the view axis chosen to stay closest to `referenceQuaternion`.
 * Writes into `out` (no allocation).
 *
 * Construction (no Euler):
 * 1. FROM basis in rest space: +Z along atomDir, up from a stable local hint.
 * 2. TO basis in world space: +Z along cameraDir; up hint = reference * same local hint
 *    (parallel-transports the reference roll onto the new forward).
 * 3. R = M_to · M_from⁻¹  ⇒  R · atomDir = cameraDir, roll locked to reference.
 */
export function getStableFocusQuaternion(
  atomWorldPosition: Vector3Like,
  moleculeWorldPosition: Vector3Like,
  cameraPosition: Vector3Like,
  referenceQuaternion: Quaternion,
  out: Quaternion,
): Quaternion {
  // --- Direction molecule → atom (rest / unrotated local offset in world) ---
  _atomDir.set(
    atomWorldPosition.x - moleculeWorldPosition.x,
    atomWorldPosition.y - moleculeWorldPosition.y,
    atomWorldPosition.z - moleculeWorldPosition.z,
  );
  if (_atomDir.lengthSq() < 1e-12) {
    // Atom at center: no unique forward — keep current orientation.
    return out.copy(referenceQuaternion);
  }
  _atomDir.normalize();

  // --- Direction molecule → camera (desired world forward for that atom) ---
  _cameraDir.set(
    cameraPosition.x - moleculeWorldPosition.x,
    cameraPosition.y - moleculeWorldPosition.y,
    cameraPosition.z - moleculeWorldPosition.z,
  );
  if (_cameraDir.lengthSq() < 1e-12) {
    return out.copy(referenceQuaternion);
  }
  _cameraDir.normalize();

  // Local up hint used for BOTH bases (same vector ⇒ consistent twist).
  pickPreferredUp(_atomDir, _preferredLocalUp);

  // World up hint: image of that local hint under the reference orientation.
  // This is what “keep roll close to current orientation” means geometrically:
  // transport reference up onto the new forward via projection (in buildBasis).
  _preferredWorldUp.copy(_preferredLocalUp).applyQuaternion(referenceQuaternion);

  // If reference mapped up nearly onto cameraDir, re-pick in world.
  if (Math.abs(_preferredWorldUp.dot(_cameraDir)) > PARALLEL_DOT) {
    pickPreferredUp(_cameraDir, _preferredWorldUp);
  }

  // FROM: rest-space frame with +Z = atomDir.
  _fromF.copy(_atomDir);
  buildBasisFromForward(_fromF, _preferredLocalUp, _fromR, _fromU);

  // TO: world-space frame with +Z = cameraDir, roll from reference up.
  _toF.copy(_cameraDir);
  buildBasisFromForward(_toF, _preferredWorldUp, _toR, _toU);

  // Columns of makeBasis are the images of local +X,+Y,+Z.
  _fromMatrix.makeBasis(_fromR, _fromU, _fromF);
  _toMatrix.makeBasis(_toR, _toU, _toF);

  // R maps FROM axes → TO axes:  R = M_to · M_from⁻¹
  // (M_from orthonormal ⇒ inverse = transpose; invert() is fine here.)
  _rotMatrix.copy(_fromMatrix).invert();
  _rotMatrix.premultiply(_toMatrix);

  return out.setFromRotationMatrix(_rotMatrix);
}

/**
 * Quaternion that rotates the molecule so the direction from molecule center
 * to the atom aligns with the direction from molecule center to the camera.
 *
 * Pure: does not mutate scene / molecule orientation.
 * Roll about the view axis is unconstrained — prefer `getStableFocusQuaternion`.
 */
export function getFocusQuaternion(
  atomWorldPosition: Vector3Like,
  moleculeWorldPosition: Vector3Like,
  cameraPosition: Vector3Like,
): Quaternion {
  _atomDir.set(
    atomWorldPosition.x - moleculeWorldPosition.x,
    atomWorldPosition.y - moleculeWorldPosition.y,
    atomWorldPosition.z - moleculeWorldPosition.z,
  );
  if (_atomDir.lengthSq() < 1e-12) {
    return new Quaternion();
  }
  _atomDir.normalize();

  _cameraDir.set(
    cameraPosition.x - moleculeWorldPosition.x,
    cameraPosition.y - moleculeWorldPosition.y,
    cameraPosition.z - moleculeWorldPosition.z,
  );
  if (_cameraDir.lengthSq() < 1e-12) {
    return new Quaternion();
  }
  _cameraDir.normalize();

  return new Quaternion().setFromUnitVectors(_atomDir, _cameraDir);
}

/**
 * Returns a camera look-at target and a suggested camera position
 * that frames the given atom with a fixed offset along the view axis.
 */
export function focusAtom(
  atomPosition: Vector3Like,
  options: {
    distance?: number;
    viewDirection?: Vector3Like;
  } = {},
): { target: Vector3; cameraPosition: Vector3 } {
  const distance = options.distance ?? 3;
  const viewDirection = new Vector3(
    options.viewDirection?.x ?? 0,
    options.viewDirection?.y ?? 0.15,
    options.viewDirection?.z ?? 1,
  ).normalize();

  const target = new Vector3(atomPosition.x, atomPosition.y, atomPosition.z);
  const cameraPosition = target.clone().addScaledVector(viewDirection, distance);

  return { target, cameraPosition };
}
