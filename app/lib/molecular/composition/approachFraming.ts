import {
  CENTER_FRAMING,
  type ViewportMode,
} from './profiles';
import {
  getAtomFocusDistance,
  type AtomFocusDistanceOptions,
} from '../math/getAtomFocusDistance';
import type { PerspectiveCamera } from 'three';

export type ApproachFraming = {
  screenX: number;
  screenY: number;
  approach: number;
};

const PLANET_LIMB_SCREEN = 0.5;
const PLANET_SAFETY_MARGIN = 0.02;
const CENTER_SAFETY_MARGIN = 0.06;
const NEAR_SHELL_MARGIN = 0.02;

const PLANET_VERTICAL_OVERHANG = 0.22;

/** Services — planet from top. */
export const TOP_APPROACH_FRAMING: ApproachFraming = {
  screenX: 0.5,
  screenY: -PLANET_VERTICAL_OVERHANG,
  approach: 0,
};

/** Portfolio — planet from bottom. */
export const BOTTOM_APPROACH_FRAMING: ApproachFraming = {
  screenX: 0.5,
  screenY: 1 + PLANET_VERTICAL_OVERHANG,
  approach: 0,
};

const FILL_TARGET_BY_MODE: Record<ViewportMode, number> = {
  desktop: 1.75,
  tablet: 1.35,
  mobile: 1.1,
};

export function approachFramingForAtom(atomId: string): ApproachFraming {
  switch (atomId) {
    case 'H2':
      return TOP_APPROACH_FRAMING;
    case 'H3':
      return BOTTOM_APPROACH_FRAMING;
    case 'H1':
    case 'H4':
    default:
      return CENTER_FRAMING;
  }
}

export function isCenterApproachFraming(framing: ApproachFraming): boolean {
  return (
    Math.abs(framing.screenX - CENTER_FRAMING.screenX) < 0.01 &&
    Math.abs(framing.screenY - CENTER_FRAMING.screenY) < 0.01 &&
    Math.abs(framing.approach - CENTER_FRAMING.approach) < 0.01
  );
}

function planetEdgeOverhang(framing: ApproachFraming): number {
  return framing.screenY <= 0.5
    ? Math.max(0, -framing.screenY)
    : Math.max(0, framing.screenY - 1);
}

function planetRadiusScreenFraction(framing: ApproachFraming): number {
  return PLANET_LIMB_SCREEN + planetEdgeOverhang(framing);
}

export function approachFillScaleForFraming(
  framing: ApproachFraming,
  mode: ViewportMode,
): number {
  if (isCenterApproachFraming(framing)) return 1;
  const diameterFrac = planetRadiusScreenFraction(framing) * 2;
  const viewportFillNeeded = diameterFrac / (1 - PLANET_SAFETY_MARGIN);
  return viewportFillNeeded / FILL_TARGET_BY_MODE[mode];
}

export function approachFocusDistanceOptions(
  atomRadius: number,
  camera: PerspectiveCamera,
  framing: ApproachFraming,
  viewportFill: number,
): AtomFocusDistanceOptions {
  if (isCenterApproachFraming(framing)) {
    return {
      viewportFill,
      fit: 'vertical',
      safetyMargin: CENTER_SAFETY_MARGIN,
      minCenterDistance: camera.near + atomRadius + NEAR_SHELL_MARGIN,
    };
  }
  return {
    viewportFill,
    fit: 'vertical',
    safetyMargin: PLANET_SAFETY_MARGIN,
    minCenterDistance: camera.near + atomRadius + NEAR_SHELL_MARGIN,
  };
}

export function minApproachFillScaleForFramings(
  mode: ViewportMode,
  ...framings: ApproachFraming[]
): number {
  let scale = 1;
  for (const framing of framings) {
    scale = Math.min(scale, approachFillScaleForFraming(framing, mode));
  }
  return scale;
}

export function retargetFillScale(
  from: ApproachFraming,
  to: ApproachFraming,
  current: ApproachFraming,
  mode: ViewportMode,
): number {
  const startScale = approachFillScaleForFraming(from, mode);
  const endScale = approachFillScaleForFraming(to, mode);
  const t = approachFramingLerpT(from, to, current);
  return startScale + (endScale - startScale) * t;
}

export function retargetFramingT(
  from: ApproachFraming,
  to: ApproachFraming,
  current: ApproachFraming,
): number {
  return approachFramingLerpT(from, to, current);
}

export function retargetFocusDistance(
  atomRadius: number,
  camera: PerspectiveCamera,
  from: ApproachFraming,
  to: ApproachFraming,
  current: ApproachFraming,
  viewportFill: number,
): number {
  const t = approachFramingLerpT(from, to, current);
  const d0 = getAtomFocusDistance(
    atomRadius,
    camera,
    approachFocusDistanceOptions(atomRadius, camera, from, viewportFill),
  );
  const d1 = getAtomFocusDistance(
    atomRadius,
    camera,
    approachFocusDistanceOptions(atomRadius, camera, to, viewportFill),
  );
  return d0 + (d1 - d0) * t;
}

function approachFramingLerpT(
  from: ApproachFraming,
  to: ApproachFraming,
  current: ApproachFraming,
): number {
  const dx = to.screenX - from.screenX;
  const dy = to.screenY - from.screenY;
  const da = to.approach - from.approach;
  const denom = dx * dx + dy * dy + da * da;
  if (denom < 1e-8) return 1;
  const cx = current.screenX - from.screenX;
  const cy = current.screenY - from.screenY;
  const ca = current.approach - from.approach;
  const t = (cx * dx + cy * dy + ca * da) / denom;
  return Math.max(0, Math.min(1, t));
}
