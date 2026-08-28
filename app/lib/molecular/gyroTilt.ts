/**
 * Calibrated device tilt → limited yaw/pitch for the mouse orientation layer.
 * Pure: no DOM, no Three.js. Callers own listener / permission / freeze gates.
 */

export type GyroCalibration = {
  restBeta: number;
  restGamma: number;
};

export type GyroSample = {
  /** Yaw about +Y (radians), already scaled and clamped to ±maxYaw * GYRO_YAW_SCALE. */
  yaw: number;
  /** Pitch about +X (radians), already scaled and clamped to ±maxPitch * GYRO_PITCH_SCALE. */
  pitch: number;
};

/** Fraction of MAX_YAW used at full gamma deflection. */
export const GYRO_YAW_SCALE = 0.45;

/** Fraction of MAX_PITCH used at full beta deflection (weaker than yaw). */
export const GYRO_PITCH_SCALE = 0.22;

/** Ignore device motion smaller than this (degrees). */
const DEADZONE_DEG = 2;

/** Quantize remaining deltas so a still phone holds a constant target. */
const QUANTIZE_DEG = 0.5;

/** Device degrees that map to full gyro yaw / pitch contribution. */
const YAW_RANGE_DEG = 28;
const PITCH_RANGE_DEG = 28;

type OrientationPermission = 'granted' | 'denied';

type DeviceOrientationCtor = {
  requestPermission?: () => Promise<OrientationPermission>;
};

export function calibrateGyro(
  beta: number,
  gamma: number,
  out: GyroCalibration,
): void {
  out.restBeta = beta;
  out.restGamma = gamma;
}

/**
 * Maps calibrated `beta` / `gamma` into limited yaw/pitch.
 * Writes `out`; does not allocate.
 */
export function sampleGyroTilt(
  beta: number,
  gamma: number,
  cal: GyroCalibration,
  maxYaw: number,
  maxPitch: number,
  out: GyroSample,
): void {
  const dGamma = gamma - cal.restGamma;
  const dBeta = beta - cal.restBeta;

  if (Math.hypot(dGamma, dBeta) < DEADZONE_DEG) {
    out.yaw = 0;
    out.pitch = 0;
    return;
  }

  const qGamma = quantize(dGamma, QUANTIZE_DEG);
  const qBeta = quantize(dBeta, QUANTIZE_DEG);
  const nx = clamp(qGamma / YAW_RANGE_DEG, -1, 1);
  // Tilt top toward the user (beta decreases) → positive pitch, same as a downward drag.
  const ny = clamp(-qBeta / PITCH_RANGE_DEG, -1, 1);

  out.yaw = nx * maxYaw * GYRO_YAW_SCALE;
  out.pitch = ny * maxPitch * GYRO_PITCH_SCALE;
}

/** True when iOS-style `DeviceOrientationEvent.requestPermission` exists. */
export function needsOrientationPermission(): boolean {
  if (typeof DeviceOrientationEvent === 'undefined') return false;
  const ctor = DeviceOrientationEvent as unknown as DeviceOrientationCtor;
  return typeof ctor.requestPermission === 'function';
}

/**
 * Resolves `true` when events may be used.
 * Platforms without the API are treated as granted (Android / desktop).
 */
export async function requestOrientationPermission(): Promise<boolean> {
  if (!needsOrientationPermission()) return true;
  const ctor = DeviceOrientationEvent as unknown as DeviceOrientationCtor;
  const request = ctor.requestPermission;
  if (!request) return true;
  try {
    const result = await request.call(DeviceOrientationEvent);
    return result === 'granted';
  } catch {
    return false;
  }
}

function quantize(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
