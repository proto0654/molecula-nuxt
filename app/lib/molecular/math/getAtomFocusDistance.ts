import type { PerspectiveCamera } from 'three';

export type AtomFocusFitAxis = 'vertical' | 'horizontal' | 'contain';

export type AtomFocusDistanceOptions = {
  /**
   * Fraction of the limiting viewport axis the sphere diameter should cover
   * before the safety margin (0–1). Default `0.9` ≈ almost full viewport.
   */
  viewportFill?: number;
  /**
   * Extra inset as a fraction of `viewportFill` so the sphere does not kiss
   * the edges. Default `0.06`.
   */
  safetyMargin?: number;
  /**
   * Minimum camera→atom-center distance so the near shell stays in front of
   * `camera.near` (pass `camera.near + atomRadius` plus a small margin).
   */
  minCenterDistance?: number;
  /**
   * Which FOV axis limits the fit.
   * - `vertical` — use `camera.fov` (current default)
   * - `horizontal` — derive HFOV from fov + aspect
   * - `contain` — max of vertical/horizontal distances (fits both axes)
   */
  fit?: AtomFocusFitAxis;
};

const DEFAULT_VIEWPORT_FILL = 0.9;
const DEFAULT_SAFETY_MARGIN = 0.06;

/**
 * Half-angle (radians) of the vertical frustum from a perspective camera FOV.
 */
function verticalHalfFovRad(camera: PerspectiveCamera): number {
  return (camera.fov * Math.PI) / 180 / 2;
}

/**
 * Half-angle (radians) of the horizontal frustum.
 * `tan(h/2) = tan(v/2) * aspect`.
 */
function horizontalHalfFovRad(camera: PerspectiveCamera): number {
  return Math.atan(Math.tan(verticalHalfFovRad(camera)) * camera.aspect);
}

/**
 * Camera–atom distance so a sphere of `atomRadius` covers the chosen viewport
 * fraction. FOV is read from the camera; callers must not change FOV for zoom.
 *
 * Geometry: at distance `d`, viewport half-extent along an axis is
 * `d * tan(halfFov)`. Sphere diameter `2r` should match
 * `effectiveFill * 2 * d * tan(halfFov)` ⇒ `d = r / (effectiveFill * tan(halfFov))`.
 */
export function getAtomFocusDistance(
  atomRadius: number,
  camera: PerspectiveCamera,
  options: AtomFocusDistanceOptions = {},
): number {
  const viewportFill = options.viewportFill ?? DEFAULT_VIEWPORT_FILL;
  const safetyMargin = options.safetyMargin ?? DEFAULT_SAFETY_MARGIN;
  const minCenterDistance = options.minCenterDistance;
  const fit = options.fit ?? 'vertical';

  const radius = Math.max(atomRadius, 1e-6);
  const fill = Math.max(viewportFill * (1 - safetyMargin), 1e-4);

  const distanceForHalfFov = (halfFovRad: number): number => {
    const tanHalf = Math.tan(halfFovRad);
    if (tanHalf < 1e-8) return radius / fill;
    return radius / (fill * tanHalf);
  };

  const dVertical = distanceForHalfFov(verticalHalfFovRad(camera));
  const dHorizontal = distanceForHalfFov(horizontalHalfFovRad(camera));

  switch (fit) {
    case 'horizontal':
      return clampMinCenterDistance(dHorizontal, minCenterDistance);
    case 'contain':
      // Larger distance ⇒ smaller on screen ⇒ fits the tighter axis.
      return clampMinCenterDistance(
        Math.max(dVertical, dHorizontal),
        minCenterDistance,
      );
    case 'vertical':
    default:
      return clampMinCenterDistance(dVertical, minCenterDistance);
  }
}

function clampMinCenterDistance(
  distance: number,
  minCenterDistance: number | undefined,
): number {
  if (minCenterDistance === undefined) return distance;
  return Math.max(distance, minCenterDistance);
}
