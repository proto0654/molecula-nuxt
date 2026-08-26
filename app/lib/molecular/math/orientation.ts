import { Matrix4, Quaternion, Vector3, type Vector3Like } from 'three';

/**
 * Builds a quaternion that orients an object so its local -Z faces `direction`
 * (Three.js camera / Object3D look convention).
 */
export function orientationFromDirection(
  direction: Vector3Like,
  up: Vector3Like = { x: 0, y: 1, z: 0 },
): Quaternion {
  const forward = new Vector3(direction.x, direction.y, direction.z);
  if (forward.lengthSq() < 1e-8) {
    return new Quaternion();
  }
  forward.normalize();

  const worldUp = new Vector3(up.x, up.y, up.z).normalize();

  // Camera looks down local -Z, so basis Z is opposite of view direction.
  const z = forward.clone().negate();
  const x = new Vector3().crossVectors(worldUp, z);
  if (x.lengthSq() < 1e-8) {
    z.x += 1e-4;
    z.normalize();
    x.crossVectors(worldUp, z);
  }
  x.normalize();
  const y = new Vector3().crossVectors(z, x);

  const matrix = new Matrix4().makeBasis(x, y, z);
  return new Quaternion().setFromRotationMatrix(matrix);
}
