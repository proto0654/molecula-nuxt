import { Vector3, type Vector3Like } from 'three';

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
