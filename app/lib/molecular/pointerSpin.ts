/**
 * Pointer-driven molecule spin: desktop speed-from-offset, touch trackball.
 * Pure: no DOM. Callers own event routing / freeze / reduced-motion gates.
 */

import { Quaternion, Vector3 } from 'three';

/** Peak angular speed (rad/s) at peak radius (before focus attenuation). */
export const SPIN_MAX_OMEGA = 6;

/** Fraction of the orbit extent used for each curve breakpoint. */
export const SPIN_EXTENT_FRACTION = {
  /** Inner dead zone — no spin near the hub. */
  deadzone: 0.12,
  /** Speed peak — compressed toward the molecule. */
  peak: 0.44,
  /** Hard cutoff — slightly outside projected peripheral atoms. */
  fade: 1.04,
} as const;

export type SpinSpeedLimits = {
  deadzone: number;
  peak: number;
  fade: number;
};

/** Build NDC speed limits from the projected outer-orbit extent. */
export function spinSpeedLimitsFromExtent(extentNdc: number): SpinSpeedLimits {
  const fade = Math.max(extentNdc * SPIN_EXTENT_FRACTION.fade, 0.1);
  return {
    deadzone: fade * SPIN_EXTENT_FRACTION.deadzone,
    peak: fade * SPIN_EXTENT_FRACTION.peak,
    fade,
  };
}

/**
 * Touch: radians per viewport-short-side of drag.
 * Dragging a distance equal to `min(w, h)` ≈ 200°.
 */
export const TOUCH_SPIN_GAIN = Math.PI * 1.1;

const AXIS_EPS_SQ = 1e-12;

/**
 * Asymmetric bump: steep rise, sharper fall — active zone stays inside the orbits.
 */
export function spinSpeedFromRadius(
  radius: number,
  limits: SpinSpeedLimits,
): number {
  const { deadzone, peak, fade } = limits;
  if (radius <= deadzone || radius >= fade) return 0;
  if (radius <= peak) {
    const t = (radius - deadzone) / (peak - deadzone);
    return SPIN_MAX_OMEGA * t * t * t;
  }
  const t = (radius - peak) / (fade - peak);
  const u = 1 - t;
  return SPIN_MAX_OMEGA * u * u * u * u;
}

/**
 * Desktop: axis through the molecule origin, lying in the camera (screen) plane,
 * perpendicular to the projected center→cursor line.
 * Screen offset (x right, y up) → 2D perpendicular (−y, x) → −y·right + x·up.
 * Integrate with `−ω·Δt` so the visible face rolls toward the cursor.
 */
export function spinAxisScreenPerpendicular(
  offsetX: number,
  offsetY: number,
  cameraRight: Vector3,
  cameraUp: Vector3,
  out: Vector3,
): boolean {
  out.copy(cameraRight).multiplyScalar(-offsetY).addScaledVector(cameraUp, offsetX);
  if (out.lengthSq() < AXIS_EPS_SQ) return false;
  out.normalize();
  return true;
}

/**
 * Touch drag in CSS pixels (x right, y down — client coordinates).
 * Axis `(dY, dX, 0)` matches prior touch yaw/pitch sign.
 */
export function spinAxisFromDrag(
  dx: number,
  dy: number,
  out: Vector3,
): boolean {
  out.set(dy, dx, 0);
  if (out.lengthSq() < AXIS_EPS_SQ) return false;
  out.normalize();
  return true;
}

/**
 * World-space increment: `q := delta * q`. Writes via `scratch` (no alloc).
 * No-op when `|angle|` is negligible.
 */
export function integrateSpin(
  q: Quaternion,
  axis: Vector3,
  angle: number,
  scratch: Quaternion,
): void {
  if (angle === 0 || axis.lengthSq() < AXIS_EPS_SQ) return;
  scratch.setFromAxisAngle(axis, angle);
  q.premultiply(scratch);
}
