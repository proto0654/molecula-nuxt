import { Quaternion, Vector2, Vector3 } from 'three';
import { AtomHover, type AtomHoverListener } from './AtomHover';
import type { HaloMode } from './AtomSelectionIndicator';
import {
  approachFillScaleForFraming,
  approachFocusDistanceOptions,
  approachFramingForAtom,
  retargetFillScale,
  retargetFocusDistance,
  type ApproachFraming,
} from './composition/approachFraming';
import {
  CENTER_FRAMING,
  COMPOSITION_PROFILES,
  type CompositionProfile,
  type ViewportMode,
} from './composition/profiles';
import { getStableFocusQuaternion } from './math/focusAtom';
import { getAtomFocusDistance } from './math/getAtomFocusDistance';
import { projectToScreenInto } from './math/projection';
import { moleculeConfig } from './moleculeConfig';
import { getOrbitNormalForAtom } from './moleculeOrbits';
import { MoleculeScene } from './MoleculeScene';
import type { TagCloudItem } from './TagCloud';
import {
  calibrateGyro,
  needsOrientationPermission,
  requestOrientationPermission,
  sampleGyroTilt,
  type GyroCalibration,
  type GyroSample,
} from './gyroTilt';
import {
  TOUCH_SPIN_GAIN,
  integrateSpin,
  spinAxisFromDrag,
  spinAxisScreenPerpendicular,
  spinSpeedFromRadius,
  spinSpeedLimitsFromExtent,
  type SpinSpeedLimits,
} from './pointerSpin';
import { PerformanceSampler } from './quality/PerformanceSampler';
import type { QualityManager } from './quality/QualityManager';
import { readQualitySearchParam } from './quality/QualityManager';
import {
  prefersTouchInput,
  subscribePointerInput,
} from '../a11y/pointerInput';
import {
  prefersReducedMotion,
  subscribeReducedMotion,
} from '../a11y/reducedMotion';
import {
  atomIdForContext,
  atomIdForSection,
  hubAtomId,
} from '../spatial/spatialAtoms';
import type { SpatialContext, SpatialMode } from '../spatial/types';

let nextControllerInstanceId = 0;

/** Limited yaw / pitch from gyro (radians) — not a full turn. */
const MAX_YAW = Math.PI / 5;
const MAX_PITCH = Math.PI / 7;

/** Movement below this (CSS px) counts as tap; above as drag. */
const TAP_MOVE_THRESHOLD_PX = 10;

/** Skip desktop spin integration when omega is below this (rad/s). */
const SPIN_OMEGA_EPS = 1e-5;

/** Higher = snappier slerp toward `targetMouseOrientation`. */
const MOUSE_FOLLOW = 6;

/**
 * Mouse / touch amplitude scale at `focusStrength = 1`.
 * Focus orientation stays dominant; pointer remains a subtle secondary spin.
 */
const MOUSE_UNDER_FOCUS = 0.22;

/**
 * Gyro keeps more amplitude under focus — home is always committed so drag-only
 * attenuation made tilt ~3° and effectively invisible on phone.
 */
const GYRO_UNDER_FOCUS = 0.62;

/** Higher = snappier slerp toward `targetFocusOrientation`. */
const FOCUS_ORIENT_FOLLOW = 4;

/** Higher = snappier damp of `focusStrength` toward `targetFocusStrength`. */
const FOCUS_STRENGTH_FOLLOW = 6;

/** Higher = snappier damp of `zoomProgress` toward `targetZoom`. */
const ZOOM_FOLLOW = 4;

/** Focus strength above which zoom-in may advance. */
const ZOOM_FOCUS_STRENGTH_GATE = 0.92;

/** Max angle (rad) between focus orient and target before zoom-in may advance. */
const ZOOM_FOCUS_ANGLE_GATE = 0.08;

/** Base framing fill used by `getAtomFocusDistance` at `fillProgress = 0`. */
const ZOOM_VIEWPORT_FILL = 0.9;

/**
 * Extra viewport fill at `fillProgress = 1` (atom overflows the frame).
 * Effective fill = lerp(ZOOM_VIEWPORT_FILL, this, fillProgress).
 */
const FILL_VIEWPORT_FILL_DESKTOP = 1.75;

const FILL_VIEWPORT_FILL_TABLET = 1.35;

/** Mobile: softer held approach — stays in frame, minimal push toward the viewer. */
const FILL_VIEWPORT_FILL_MOBILE = 1.1;

function fillViewportTargetForMode(mode: ViewportMode): number {
  switch (mode) {
    case 'mobile':
      return FILL_VIEWPORT_FILL_MOBILE;
    case 'tablet':
      return FILL_VIEWPORT_FILL_TABLET;
    case 'desktop':
      return FILL_VIEWPORT_FILL_DESKTOP;
  }
}

const AXIS_Y = new Vector3(0, 1, 0);
const AXIS_X = new Vector3(1, 0, 0);

/** Layout size for camera aspect / renderer; prefers `visualViewport` on mobile. */
function getViewportSize(): { width: number; height: number } {
  const vv = window.visualViewport;
  if (vv) {
    return { width: vv.width, height: vv.height };
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

export type PointerNorm = {
  /** Offset X in NDC; 0 = projected molecule origin. */
  x: number;
  /** Offset Y in NDC; 0 = projected molecule origin; +Y = up. */
  y: number;
};

export type AtomClickListener = (atomId: string | null) => void;

export type AfterUpdateListener = (delta: number) => void;

export type AtomScreenPoint = {
  x: number;
  y: number;
  visible: boolean;
};

export class MoleculeController {
  readonly scene: MoleculeScene;
  readonly quality: QualityManager;
  readonly instanceId: number;

  /** Rest pose (identity for now). Absolute — never accumulated. */
  private readonly baseOrientation = new Quaternion();

  /** Smoothed pointer layer (spin + gyro). */
  private readonly mouseOrientation = new Quaternion();

  /** Target pointer layer: `gyroQ × spinOrientation`. */
  private readonly targetMouseOrientation = new Quaternion();

  /** Accumulated free spin from mouse velocity / touch drag. */
  private readonly spinOrientation = new Quaternion();

  /** Smoothed atom→camera focus pose. */
  private readonly focusOrientation = new Quaternion();

  /** Absolute focus target from the latest `focusAtom` call. */
  private readonly targetFocusOrientation = new Quaternion();

  /**
   * How much focus is mixed in, smoothed in [0, 1].
   * 0 = mouse over base only; 1 = full focus on top of mouse.
   */
  focusStrength = 0;

  /** Target blend weight: 1 while focused, 0 after `clearFocus`. */
  private targetFocusStrength = 0;

  /**
   * Smoothed zoom-in amount in [0, 1]. Independent of mouse / focus orientation.
   * 0 = rest molecule translation; 1 = selected atom framed at focus distance.
   */
  zoomProgress = 0;

  /** Target zoom: 1 after `zoomToAtom`, 0 after `clearZoom`. */
  targetZoom = 0;

  /**
   * Extra proximity beyond base framing in [0, 1].
   * Driven by `Navigator` during page transition (atom fills viewport).
   */
  fillProgress = 0;

  /** Atom used for zoom framing; kept while zooming out until progress ≈ 0. */
  private zoomAtomId: string | null = null;

  /**
   * When true, `Navigator` owns `zoomProgress` / `fillProgress` — skip local damp.
   */
  private transitionDriven = false;

  /**
   * Off-home retarget only: screen drift stays linear while zoomProgress
   * modulates depth only (leave-home / approachTo unchanged).
   */
  private uniformScreenDrift = false;

  /** Framing at retarget / leave-home start — stable lerp endpoints. */
  private retargetFromFraming: ApproachFraming | null = null;

  /** Rest translation of `moleculeGroup` (zoom offset is applied on top). */
  private readonly baseMoleculePosition = new Vector3();

  /**
   * Desired visual center of the molecule as viewport fractions + approach.
   * Applied via world offset along camera axes — never reads CSS sidebar width.
   */
  private compositionProfile: CompositionProfile = COMPOSITION_PROFILES.mobile;

  /**
   * Temporary framing override (e.g. screen-center during peripheral retarget).
   * Merged over `compositionProfile` in `applyCompositionBias`; does not change mode/layout.
   */
  private compositionFramingOverride: {
    screenX: number;
    screenY: number;
    approach: number;
  } | null = null;

  /**
   * Settled off-home approach framing (planet-in-frame). Used by zoom translation
   * when GSAP is not driving `compositionFramingOverride`.
   */
  private approachFraming: ApproachFraming | null = null;

  /** Look-at used for composition distance (matches MoleculeScene camera). */
  private readonly compositionLookAt = new Vector3(0, 0.2, 0);

  /** Fine pointer is inside the document — desktop spin from live offset. */
  private hasFinePointer = false;

  /** Cached canvas CSS box; refreshed on resize / visualViewport scroll. */
  private readonly canvasRect = { left: 0, top: 0, width: 1, height: 1 };

  /** Calibrated gyro contribution; composed with spin into the mouse target. */
  private gyroYaw = 0;
  private gyroPitch = 0;
  private gyroCalibrated = false;
  private gyroBound = false;
  private gyroPermissionAsked = false;
  private gyroPermission: 'unknown' | 'granted' | 'denied' | 'not-needed' =
    'unknown';
  private lastGyroBeta: number | null = null;
  private lastGyroGamma: number | null = null;
  private readonly gyroCal: GyroCalibration = { restBeta: 0, restGamma: 0 };
  private readonly gyroSample: GyroSample = { yaw: 0, pitch: 0 };

  /** Coarse / no-hover: gyro eligible, canvas hover skipped (autoplay safety). */
  private touchInput = false;

  /** Atom id last passed to `focusAtom` while focus is active. */
  private focusedAtomId: string | null = null;
  /** Spatial entity slug (case/service) — pose stays on the context atom. */
  private lastEntityId: string | null = null;

  /**
   * Hero approach: full orbit sweep around the active atom's ring (0→1 = 0→2π).
   * Settled focus is captured at sweep start; ends back on the same facing pose.
   */
  private orbitSweepProgress = 0;
  private readonly orbitSweepAxis = new Vector3();
  private orbitSweepActive = false;
  private readonly stableFocusForSweep = new Quaternion();
  private readonly scratchOrbitSpin = new Quaternion();
  private readonly scratchFocusWithSweep = new Quaternion();

  private touchPointerId: number | null = null;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchLastX = 0;
  private touchLastY = 0;
  private touchDragging = false;
  private suppressNextClick = false;

  /** Last composed orientation — dirty hover pick when the molecule spins under a still pointer. */
  private readonly lastHoverQuaternion = new Quaternion();

  /**
   * Last pose used for label billboards.
   * Starts as (0,0,0,0) so the first frame always updates labels.
   */
  private readonly lastLabelQuaternion = new Quaternion(0, 0, 0, 0);

  private lastLabelZoomProgress = Number.NaN;
  private lastLabelFillProgress = Number.NaN;

  private readonly scratchYaw = new Quaternion();
  private readonly scratchPitch = new Quaternion();
  private readonly scratchIdentity = new Quaternion();
  private readonly scratchAppliedFocus = new Quaternion();
  private readonly scratchCompose = new Quaternion();
  private readonly scratchMoleculePos = new Vector3();
  private readonly scratchAtomPos = new Vector3();
  private readonly scratchAtomWorldCenter = new Vector3();
  private readonly scratchCameraPos = new Vector3();
  private readonly scratchLookDir = new Vector3();
  private readonly scratchZoomOffset = new Vector3();
  private readonly scratchCameraRight = new Vector3();
  private readonly scratchCameraUp = new Vector3();
  private readonly scratchRandomAxis = new Vector3();
  private readonly scratchHalfTurn = new Quaternion();
  private readonly scratchSpinAxis = new Vector3();
  private readonly scratchSpinDelta = new Quaternion();
  private readonly pointerNorm: PointerNorm = { x: 0, y: 0 };
  /** Latest fine-pointer NDC (screen center = 0). */
  private readonly pointerNdc = new Vector2();
  /** Projected molecule origin in NDC — spin offset is relative to this, not authored framing. */
  private readonly spinOriginNdc = new Vector2();
  /** Max NDC offset of peripheral atoms from the hub — spin fades at the outer orbits. */
  private spinExtentNdc = 0.32;
  private readonly spinSpeedLimits: SpinSpeedLimits = {
    deadzone: 0.04,
    peak: 0.14,
    fade: 0.33,
  };
  private readonly atomHover = new AtomHover();
  private readonly atomClickListeners = new Set<AtomClickListener>();
  private readonly afterUpdateListeners = new Set<AfterUpdateListener>();
  private readonly scratchNdc = new Vector2();
  private readonly scratchPixels = new Vector2();
  private elapsed = 0;

  private rafId = 0;
  private lastTime = 0;
  private running = false;
  private frozen = false;
  /** Mirrors Navigator TransitionState.busy — chrome dim waits until approach settles. */
  private approachBusy = false;
  private spatialMode: SpatialMode = 'home';
  private readonly canvas: HTMLCanvasElement;
  private readonly sampler: PerformanceSampler;
  private readonly unsubscribeQuality: () => void;
  private readonly unsubscribeReducedMotion: () => void;
  private readonly unsubscribePointerInput: () => void;
  private reducedMotion = false;
  private readonly onResizeBound: () => void;
  private readonly onOrientationChangeBound: () => void;
  private readonly onPointerMoveBound: (event: PointerEvent) => void;
  private readonly onPointerLeaveBound: () => void;
  private readonly onClickBound: (event: MouseEvent) => void;
  private readonly onPointerDownBound: (event: PointerEvent) => void;
  private readonly onPointerUpBound: (event: PointerEvent) => void;
  private readonly onPointerCancelBound: (event: PointerEvent) => void;
  private readonly onDeviceOrientationBound: (
    event: DeviceOrientationEvent,
  ) => void;
  private readonly onVisibilityBound: () => void;

  constructor(canvas: HTMLCanvasElement, quality: QualityManager) {
    this.instanceId = ++nextControllerInstanceId;
    this.canvas = canvas;
    this.quality = quality;
    this.scene = new MoleculeScene(canvas, quality);
    this.scene.buildMolecule(moleculeConfig);
    this.baseMoleculePosition.set(0, 0, 0);
    this.applyCompositionBias();

    this.sampler = new PerformanceSampler(quality, {
      skip: readQualitySearchParam() !== null,
      cap: quality.get().level,
    });

    this.unsubscribeQuality = quality.subscribe((settings) => {
      this.scene.applyQuality(settings);
      this.syncReducedMotionVisuals();
    });

    this.reducedMotion = prefersReducedMotion();
    this.unsubscribeReducedMotion = subscribeReducedMotion((next) => {
      this.reducedMotion = next;
      this.syncReducedMotionVisuals();
      this.syncGyroBinding();
    });
    this.touchInput = prefersTouchInput();
    this.unsubscribePointerInput = subscribePointerInput((touch) => {
      this.touchInput = touch;
      this.syncGyroBinding();
    });
    this.gyroPermission = needsOrientationPermission()
      ? 'unknown'
      : 'not-needed';
    this.syncReducedMotionVisuals();

    this.onResizeBound = () => {
      const { width, height } = getViewportSize();
      this.scene.resize(width, height);
      this.applyCompositionBias();
      this.refreshCanvasRect();
      this.scene.moleculeGroup.updateMatrixWorld(true);
      this.refreshSpinOriginNdc();
      this.refreshSpinExtentNdc();
      // Aspect / projection changed — refresh pick and label billboards.
      if (!this.touchInput) {
        this.atomHover.markDirty();
      }
      this.lastLabelZoomProgress = Number.NaN;
    };

    this.onOrientationChangeBound = () => {
      this.onResizeBound();
      this.invalidateGyroCalibration();
    };

    this.onPointerMoveBound = (event: PointerEvent) => {
      if (this.frozen) return;
      if (this.touchPointerId !== null) {
        this.handleTouchMove(event);
        return;
      }
      if (event.pointerType === 'touch' || event.pointerType === 'pen') {
        return;
      }
      const rect = this.canvasRect;
      const w = Math.max(rect.width, 1);
      const h = Math.max(rect.height, 1);
      const fracX = (event.clientX - rect.left) / w;
      const fracY = (event.clientY - rect.top) / h;
      const ndcX = fracX * 2 - 1;
      const ndcY = -(fracY * 2 - 1);
      this.pointerNdc.set(ndcX, ndcY);
      this.hasFinePointer = !this.reducedMotion;
      this.atomHover.setPointerNdc(ndcX, ndcY);
    };

    this.onPointerLeaveBound = () => {
      if (this.frozen) return;
      if (this.touchPointerId !== null) return;
      this.hasFinePointer = false;
      this.atomHover.clear();
    };

    this.onClickBound = (event: MouseEvent) => {
      if (this.frozen) return;
      if (this.suppressNextClick) {
        this.suppressNextClick = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      this.emitPickAtClient(event.clientX, event.clientY);
    };

    this.onPointerDownBound = (event: PointerEvent) => {
      if (this.frozen) return;
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      if (this.touchPointerId !== null) return;
      this.touchPointerId = event.pointerId;
      this.touchStartX = event.clientX;
      this.touchStartY = event.clientY;
      this.touchLastX = event.clientX;
      this.touchLastY = event.clientY;
      this.touchDragging = false;
      this.hasFinePointer = false;
      this.foldGyroIntoDrag();
      this.canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

    this.onPointerUpBound = (event: PointerEvent) => {
      if (event.pointerId !== this.touchPointerId) return;
      const wasDragging = this.touchDragging;
      const x = event.clientX;
      const y = event.clientY;
      this.endTouchGesture(event.pointerId);
      // Always swallow the synthetic click that follows touch.
      this.suppressNextClick = true;
      if (!wasDragging) {
        this.emitPickAtClient(x, y);
        void this.requestGyroPermissionAfterTap();
      }
    };

    this.onPointerCancelBound = (event: PointerEvent) => {
      if (event.pointerId !== this.touchPointerId) return;
      this.endTouchGesture(event.pointerId);
      this.suppressNextClick = true;
    };

    this.onDeviceOrientationBound = (event: DeviceOrientationEvent) => {
      this.handleDeviceOrientation(event);
    };

    this.onVisibilityBound = () => {
      this.syncGyroBinding();
    };
  }

  private handleTouchMove(event: PointerEvent): void {
    if (this.frozen) return;
    if (event.pointerId !== this.touchPointerId) return;
    if (this.reducedMotion) return;
    const dx = event.clientX - this.touchStartX;
    const dy = event.clientY - this.touchStartY;
    if (!this.touchDragging) {
      if (Math.hypot(dx, dy) < TAP_MOVE_THRESHOLD_PX) return;
      this.touchDragging = true;
    }

    const stepX = event.clientX - this.touchLastX;
    const stepY = event.clientY - this.touchLastY;
    this.touchLastX = event.clientX;
    this.touchLastY = event.clientY;

    if (!spinAxisFromDrag(stepX, stepY, this.scratchSpinAxis)) {
      event.preventDefault();
      return;
    }

    const span = Math.min(
      Math.max(this.canvasRect.width, 1),
      Math.max(this.canvasRect.height, 1),
    );
    const mouseScale = 1 - this.focusStrength * (1 - MOUSE_UNDER_FOCUS);
    const angle =
      (Math.hypot(stepX, stepY) / span) * TOUCH_SPIN_GAIN * mouseScale;
    integrateSpin(
      this.spinOrientation,
      this.scratchSpinAxis,
      angle,
      this.scratchSpinDelta,
    );
    this.applyMouseTarget();
    event.preventDefault();
  }

  private endTouchGesture(pointerId: number): void {
    if (this.canvas.hasPointerCapture(pointerId)) {
      this.canvas.releasePointerCapture(pointerId);
    }
    this.touchPointerId = null;
    this.touchDragging = false;
    this.recalibrateGyroFromLastSample();
  }

  private emitPickAtClient(clientX: number, clientY: number): void {
    const rect = this.canvasRect;
    const w = Math.max(rect.width, 1);
    const h = Math.max(rect.height, 1);
    const ndcX = ((clientX - rect.left) / w) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / h) * 2 - 1);

    this.scene.moleculeGroup.updateMatrixWorld(true);
    const atomId = this.atomHover.pickAt(
      ndcX,
      ndcY,
      this.scene.camera,
      this.scene.getAtomMeshes(),
    );

    for (const listener of this.atomClickListeners) {
      listener(atomId);
    }
  }

  private applyMouseTarget(gyroScale = 1): void {
    const yaw = Math.max(
      -MAX_YAW,
      Math.min(MAX_YAW, this.gyroYaw * gyroScale),
    );
    const pitch = Math.max(
      -MAX_PITCH,
      Math.min(MAX_PITCH, this.gyroPitch * gyroScale),
    );
    this.scratchYaw.setFromAxisAngle(AXIS_Y, yaw);
    this.scratchPitch.setFromAxisAngle(AXIS_X, pitch);
    this.targetMouseOrientation
      .copy(this.scratchYaw)
      .multiply(this.scratchPitch)
      .multiply(this.spinOrientation);
  }

  /** Bake live gyro into spin so mute-on-touch does not jump the pose. */
  private foldGyroIntoDrag(): void {
    this.scratchYaw.setFromAxisAngle(AXIS_Y, this.gyroYaw);
    this.scratchPitch.setFromAxisAngle(AXIS_X, this.gyroPitch);
    this.scratchSpinDelta.copy(this.scratchYaw).multiply(this.scratchPitch);
    this.spinOrientation.premultiply(this.scratchSpinDelta);
    this.gyroYaw = 0;
    this.gyroPitch = 0;
    this.applyMouseTarget();
  }

  private refreshCanvasRect(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvasRect.left = rect.left;
    this.canvasRect.top = rect.top;
    this.canvasRect.width = rect.width;
    this.canvasRect.height = rect.height;
  }

  /**
   * Screen position of the molecule origin (hub / group), in NDC.
   * Home desktop bias, zoom, and approach all move this — do not use authored screenX.
   * Caller must have a current world matrix on `moleculeGroup`.
   */
  private refreshSpinOriginNdc(): void {
    this.scene.moleculeGroup.getWorldPosition(this.scratchMoleculePos);
    const width = Math.max(this.canvasRect.width, 1);
    const height = Math.max(this.canvasRect.height, 1);
    projectToScreenInto(
      this.scratchMoleculePos,
      this.scene.camera,
      { width, height },
      this.scratchNdc,
      this.scratchPixels,
    );
    this.spinOriginNdc.copy(this.scratchNdc);
  }

  /**
   * Furthest peripheral atom from the hub in NDC — spin cuts off just outside the orbits.
   */
  private refreshSpinExtentNdc(): void {
    const width = Math.max(this.canvasRect.width, 1);
    const height = Math.max(this.canvasRect.height, 1);
    const viewport = { width, height };
    let maxR = 0;
    for (const atom of this.scene.getAtoms()) {
      if (atom.object.position.lengthSq() < 1e-12) continue;
      atom.mesh.getWorldPosition(this.scratchAtomPos);
      projectToScreenInto(
        this.scratchAtomPos,
        this.scene.camera,
        viewport,
        this.scratchNdc,
        this.scratchPixels,
      );
      const dx = this.scratchNdc.x - this.spinOriginNdc.x;
      const dy = this.scratchNdc.y - this.spinOriginNdc.y;
      maxR = Math.max(maxR, Math.hypot(dx, dy));
    }
    if (maxR > 1e-6) {
      this.spinExtentNdc = maxR;
      const limits = spinSpeedLimitsFromExtent(maxR);
      this.spinSpeedLimits.deadzone = limits.deadzone;
      this.spinSpeedLimits.peak = limits.peak;
      this.spinSpeedLimits.fade = limits.fade;
    }
  }

  private handleDeviceOrientation(event: DeviceOrientationEvent): void {
    if (this.frozen || this.reducedMotion) return;
    if (this.touchPointerId !== null) return;
    const beta = event.beta;
    const gamma = event.gamma;
    if (beta == null || gamma == null) return;

    this.lastGyroBeta = beta;
    this.lastGyroGamma = gamma;

    if (!this.gyroCalibrated) {
      calibrateGyro(beta, gamma, this.gyroCal);
      this.gyroCalibrated = true;
      this.gyroYaw = 0;
      this.gyroPitch = 0;
      this.applyMouseTarget();
      return;
    }

    sampleGyroTilt(
      beta,
      gamma,
      this.gyroCal,
      MAX_YAW,
      MAX_PITCH,
      this.gyroSample,
    );
    if (
      this.gyroSample.yaw === this.gyroYaw &&
      this.gyroSample.pitch === this.gyroPitch
    ) {
      return;
    }
    this.gyroYaw = this.gyroSample.yaw;
    this.gyroPitch = this.gyroSample.pitch;
    this.applyMouseTarget();
  }

  private recalibrateGyroFromLastSample(): void {
    if (this.lastGyroBeta == null || this.lastGyroGamma == null) {
      this.invalidateGyroCalibration();
      return;
    }
    calibrateGyro(this.lastGyroBeta, this.lastGyroGamma, this.gyroCal);
    this.gyroCalibrated = true;
    this.gyroYaw = 0;
    this.gyroPitch = 0;
    this.applyMouseTarget();
  }

  private invalidateGyroCalibration(): void {
    this.gyroCalibrated = false;
    this.lastGyroBeta = null;
    this.lastGyroGamma = null;
    this.gyroYaw = 0;
    this.gyroPitch = 0;
    if (!this.frozen) {
      this.applyMouseTarget();
    }
  }

  private syncGyroBinding(): void {
    const canBind =
      this.running &&
      !this.frozen &&
      !this.reducedMotion &&
      this.touchInput &&
      this.sampler.done &&
      document.visibilityState === 'visible' &&
      (this.gyroPermission === 'granted' ||
        this.gyroPermission === 'not-needed');

    if (canBind) {
      this.bindGyro();
    } else {
      this.unbindGyro();
    }
  }

  private bindGyro(): void {
    if (this.gyroBound) return;
    window.addEventListener('deviceorientation', this.onDeviceOrientationBound, {
      passive: true,
    });
    this.gyroBound = true;
    this.gyroCalibrated = false;
  }

  private unbindGyro(): void {
    if (!this.gyroBound) return;
    window.removeEventListener(
      'deviceorientation',
      this.onDeviceOrientationBound,
    );
    this.gyroBound = false;
    this.gyroYaw = 0;
    this.gyroPitch = 0;
    this.gyroCalibrated = false;
    if (!this.frozen) {
      this.applyMouseTarget();
    }
  }

  /** iOS: ask after the tap has already picked — never steal the first commit. */
  private async requestGyroPermissionAfterTap(): Promise<void> {
    if (this.gyroPermissionAsked) return;
    if (!needsOrientationPermission()) return;
    this.gyroPermissionAsked = true;
    const granted = await requestOrientationPermission();
    this.gyroPermission = granted ? 'granted' : 'denied';
    this.syncGyroBinding();
  }

  getHoveredAtomId(): string | null {
    return this.atomHover.getHoveredAtomId();
  }

  /**
   * Enter/leave: fires with the hovered atom id, or `null` when the pointer leaves atoms.
   * Suitable for wiring focus later.
   */
  onAtomHover(listener: AtomHoverListener): () => void {
    return this.atomHover.onAtomHover(listener);
  }

  /**
   * Click pick: atom id, or `null` when the click misses atoms (zoom-out path).
   */
  onAtomClick(listener: AtomClickListener): () => void {
    this.atomClickListeners.add(listener);
    return () => {
      this.atomClickListeners.delete(listener);
    };
  }

  getFrozen(): boolean {
    return this.frozen;
  }

  getApproachBusy(): boolean {
    return this.approachBusy;
  }

  /** Settled off-home pose: frozen route with approach timeline idle. */
  isSettledOffHome(): boolean {
    return this.frozen && !this.approachBusy && this.spatialMode !== 'home';
  }

  getSpatialMode(): SpatialMode {
    return this.spatialMode;
  }

  getFocusedAtomId(): string | null {
    return this.focusedAtomId;
  }

  /**
   * Stop pointer/touch spin, drop residual mouse pose, hide atom labels.
   * Animation loop and renderer keep running.
   */
  freeze(): void {
    this.frozen = true;
    this.resetPointerTilt();
    this.atomHover.clear();
    this.scene.setLabelsVisible(false);
    this.syncChromeDim();
    this.syncGyroBinding();
  }

  unfreeze(): void {
    this.frozen = false;
    this.scene.setLabelsVisible(true);
    this.syncChromeDim();
    this.syncGyroBinding();
  }

  /**
   * While Navigator owns the approach timeline, keep selection chrome at base color.
   * Settled freeze (`frozen && !busy`) lerps rings / cross / wireframe to dim chrome.
   */
  setApproachBusy(busy: boolean): void {
    if (this.approachBusy === busy) return;
    this.approachBusy = busy;
    this.syncChromeDim();
  }

  /**
   * Home is the only interactive mode. Other modes freeze pointer spin.
   */
  setMode(mode: SpatialMode): void {
    this.spatialMode = mode;
    if (mode === 'home') {
      this.unfreeze();
    } else {
      this.freeze();
    }
  }

  /**
   * Focus the hub atom (Home). No random π-flip on initial / already-hub.
   */
  restoreOverview(options: { immediate?: boolean } = {}): void {
    this.clearApproachFraming();
    const hubId = this.getHubAtomId();
    this.focusAtom(hubId);
    this.targetZoom = 0;
    if (options.immediate) {
      this.snapFocus();
      this.setZoomProgress(0);
      this.setFillProgress(0);
    }
  }

  focusSection(sectionId: string): void {
    const atomId = atomIdForSection(sectionId);
    if (atomId) this.focusAtom(atomId);
  }

  focusContext(context: SpatialContext): void {
    const atomId = atomIdForContext(context);
    if (atomId) this.focusAtom(atomId);
  }

  /**
   * Entity id is spatial-state only — pose stays on the context atom.
   */
  focusEntity(entityId: string): void {
    this.lastEntityId = entityId;
  }

  getLastEntityId(): string | null {
    return this.lastEntityId;
  }

  /**
   * Frozen entity flip: point light sweeps R→L across the focused atom facets.
   */
  playEntityLightSweep(direction: 1 | -1 = 1): void {
    if (!this.frozen || this.reducedMotion || !this.focusedAtomId) return;
    const atom = this.scene.getAtom(this.focusedAtomId);
    if (!atom) return;
    this.scene.moleculeGroup.updateMatrixWorld(true);
    atom.mesh.getWorldPosition(this.scratchAtomWorldCenter);
    this.scene.startEntityLightSweep(
      this.focusedAtomId,
      this.scratchAtomWorldCenter,
      direction,
      'horizontal',
    );
  }

  /**
   * Archive ↔ detail: depth light sweep toward viewer (1) or into the screen (−1).
   */
  playArchiveTransitionCue(direction: 1 | -1 = 1): void {
    if (this.reducedMotion || !this.focusedAtomId) return;
    const atom = this.scene.getAtom(this.focusedAtomId);
    if (!atom) return;
    this.scene.moleculeGroup.updateMatrixWorld(true);
    atom.mesh.getWorldPosition(this.scratchAtomWorldCenter);
    this.scene.startEntityLightSweep(
      this.focusedAtomId,
      this.scratchAtomWorldCenter,
      direction,
      'depth',
    );
  }

  /**
   * Hold the atom-fills-viewport approach (the old Navigator destination pose).
   * Pointer freeze is separate — caller still calls `freeze()`.
   */
  holdApproach(options: { immediate?: boolean } = {}): void {
    const atomId = this.focusedAtomId;
    if (atomId && this.scene.getAtom(atomId)) {
      this.zoomAtomId = atomId;
      // Skip redundant focusAtom when already targeting this atom.
      if (this.targetFocusStrength < 1) {
        this.focusAtom(atomId);
      }
    }
    if (options.immediate) {
      this.snapFocus();
    }
    this.setZoomProgress(1);
    this.setFillProgress(1);
  }

  /**
   * Settle zoom/fill at approach without recomputing focus (avoids end-of-tween snap).
   */
  settleApproachProgress(): void {
    const atomId = this.focusedAtomId;
    if (atomId && this.scene.getAtom(atomId)) {
      this.zoomAtomId = atomId;
    }
    this.setZoomProgress(1);
    this.setFillProgress(1);
  }

  /**
   * Temporary rest framing (viewport fractions). Pass `null` to restore the profile.
   * Used by peripheral retarget so pullback lands on screen center.
   */
  setCompositionFramingOverride(
    override: { screenX: number; screenY: number; approach?: number } | null,
  ): void {
    if (!override) {
      if (!this.compositionFramingOverride) return;
      this.compositionFramingOverride = null;
      this.applyCompositionBias();
      return;
    }
    this.compositionFramingOverride = {
      screenX: override.screenX,
      screenY: override.screenY,
      approach: override.approach ?? 0,
    };
    this.applyCompositionBias();
  }

  /** Active rest framing (override if set, else viewport profile). */
  getActiveCompositionFraming(): {
    screenX: number;
    screenY: number;
    approach: number;
  } {
    const framing = this.compositionFramingOverride ?? this.compositionProfile;
    return {
      screenX: framing.screenX,
      screenY: framing.screenY,
      approach: framing.approach,
    };
  }

  /** Framing that drives zoom focus (GSAP override → settled approach → center). */
  getZoomTargetFraming(): ApproachFraming {
    if (this.compositionFramingOverride) {
      return this.compositionFramingOverride;
    }
    if (this.approachFraming) {
      return this.approachFraming;
    }
    return CENTER_FRAMING;
  }

  /** Persisted planet framing for settled off-home approach pose. */
  setApproachFraming(framing: ApproachFraming | null): void {
    this.approachFraming = framing;
  }

  clearApproachFraming(): void {
    this.approachFraming = null;
  }

  /** Ensure settled approach framing matches the focused atom (resize / orientation). */
  syncApproachFramingForFocusedAtom(): void {
    if (!this.isAtApproach()) return;
    const atomId = this.focusedAtomId;
    if (!atomId) return;
    this.approachFraming = approachFramingForAtom(atomId);
  }

  /** True when zoom+fill are already at the approach destination. */
  isAtApproach(): boolean {
    return this.zoomProgress >= 0.92 && this.fillProgress >= 0.92;
  }

  /** Instantly match smoothed focus to the current target (first paint / direct load). */
  snapFocus(): void {
    this.focusStrength = this.targetFocusStrength;
    this.focusOrientation.copy(this.targetFocusOrientation);
  }

  /**
   * Sets `targetFocusOrientation` so the atom faces the camera and raises focus strength.
   * Uses rest-frame atom position (local + molecule translation) so the result
   * is an absolute focus orientation, independent of the mouse layer.
   * Twist/roll is locked relative to the current `focusOrientation`.
   *
   * Hub / Home (zero offset): no unique forward — π flip only when retargeting
   * onto the hub from another atom. Initial overview keeps identity.
   * Clears residual pointer/touch spin so the focused atom actually faces the camera.
   */
  focusAtom(atomId: string): void {
    const atom = this.scene.getAtom(atomId);
    if (!atom) return;

    const alreadyFocused =
      this.focusedAtomId === atomId && this.targetFocusStrength > 0.5;

    // Same atom: keep the existing target — recomputing stable focus walks twist.
    if (alreadyFocused) {
      this.targetFocusStrength = 1;
      return;
    }

    // Rest-frame molecule origin (ignore live zoom translation).
    this.scratchMoleculePos.copy(this.baseMoleculePosition);
    // Rest pose: ignore current group rotation so focus Q stays absolute.
    this.scratchAtomPos.copy(atom.object.position).add(this.scratchMoleculePos);

    if (atom.object.position.lengthSq() < 1e-12) {
      const retargetFromOther =
        this.focusedAtomId !== null && this.focusedAtomId !== atomId;
      if (retargetFromOther) {
        this.scratchRandomAxis.set(
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
        );
        if (this.scratchRandomAxis.lengthSq() < 1e-8) {
          this.scratchRandomAxis.set(0, 1, 0);
        } else {
          this.scratchRandomAxis.normalize();
        }
        this.scratchHalfTurn.setFromAxisAngle(this.scratchRandomAxis, Math.PI);
        this.targetFocusOrientation
          .copy(this.scratchHalfTurn)
          .multiply(this.focusOrientation);
      }
    } else {
      this.scene.camera.getWorldPosition(this.scratchCameraPos);
      getStableFocusQuaternion(
        this.scratchAtomPos,
        this.scratchMoleculePos,
        this.scratchCameraPos,
        this.focusOrientation,
        this.targetFocusOrientation,
      );
    }

    this.focusedAtomId = atomId;
    this.targetFocusStrength = 1;

    // Drop leftover touch drag / mouse / gyro spin so focus lands on the look axis.
    // Fine pointers resume velocity on the next `pointermove`. Gyro recalibrates on the next sample.
    this.resetPointerTilt();
  }

  /** Fade focus influence out via `focusStrength` → 0; keep last focus pose. */
  clearFocus(): void {
    this.targetFocusStrength = 0;
    this.focusedAtomId = null;
  }

  /** Clears accumulated spin, gyro contribution, and both mouse orientation layers. */
  private resetPointerTilt(): void {
    this.spinOrientation.identity();
    this.gyroYaw = 0;
    this.gyroPitch = 0;
    this.gyroCalibrated = false;
    this.targetMouseOrientation.identity();
    this.mouseOrientation.identity();
  }

  /**
   * Phase 1: ensure focus orientation. Phase 2: `targetZoom = 1` (gated until focus settles).
   * Zoom translation is separate from mouse / focus quaternion layers.
   * Soft-retargets when the atom changes (keeps current `zoomProgress`).
   */
  zoomToAtom(atomId: string): void {
    const atom = this.scene.getAtom(atomId);
    if (!atom) return;

    this.zoomAtomId = atomId;
    this.focusAtom(atomId);
    this.targetZoom = 1;
  }

  /**
   * Transition entry: focus + zoom atom without hard-resetting progress.
   * Used by `Navigator` so mid-flight retargets stay continuous.
   */
  prepareTransitionTarget(atomId: string): void {
    const atom = this.scene.getAtom(atomId);
    if (!atom) return;
    this.zoomAtomId = atomId;
    this.focusAtom(atomId);
    this.targetZoom = Math.max(this.targetZoom, this.zoomProgress, 0);
  }

  /** Direct zoom write for GSAP-driven transitions (also syncs `targetZoom`). */
  setZoomProgress(value: number): void {
    const next = Math.max(0, Math.min(1, value));
    this.zoomProgress = next;
    this.targetZoom = next;
  }

  /** Extra fill beyond base framing; used in the “atom fills viewport” phase. */
  setFillProgress(value: number): void {
    this.fillProgress = Math.max(0, Math.min(1, value));
  }

  /**
   * When `true`, local zoom damping is skipped — `Navigator` drives progress.
   */
  setTransitionDriven(active: boolean): void {
    this.transitionDriven = active;
    if (!active) {
      this.uniformScreenDrift = false;
      this.retargetFromFraming = null;
      this.finishOrbitSweep();
    }
  }

  /** Record framing at transition start for stable fill / focus-distance lerp. */
  beginRetargetBlend(from: ApproachFraming): void {
    this.retargetFromFraming = {
      screenX: from.screenX,
      screenY: from.screenY,
      approach: from.approach,
    };
  }

  /** Peripheral retarget: linear screen drift, zoom dip affects depth only. */
  setUniformScreenDrift(active: boolean): void {
    this.uniformScreenDrift = active;
  }

  /**
   * Capture settled focus and arm a full orbit revolution during hero approach.
   * No-op for hub / atoms without an orbit placement.
   */
  beginOrbitSweep(atomId: string): boolean {
    if (!getOrbitNormalForAtom(atomId, this.orbitSweepAxis)) {
      this.finishOrbitSweep();
      return false;
    }
    this.stableFocusForSweep.copy(this.targetFocusOrientation);
    this.orbitSweepProgress = 0;
    this.orbitSweepActive = true;
    this.applyOrbitSweepPose();
    return true;
  }

  /** 0→1 maps to 0→2π about the active atom's orbit normal. */
  setOrbitSweepProgress(value: number): void {
    if (!this.orbitSweepActive) return;
    this.orbitSweepProgress = Math.max(0, Math.min(1, value));
    this.applyOrbitSweepPose();
  }

  /**
   * End the sweep on the settled facing pose (2π ≡ identity).
   * Snaps display + target so lagged slerp cannot take the short path home.
   */
  finishOrbitSweep(): void {
    if (!this.orbitSweepActive) return;
    this.orbitSweepProgress = 1;
    this.applyOrbitSweepPose();
    this.orbitSweepActive = false;
    this.orbitSweepProgress = 0;
  }

  /**
   * Direct pose write — not through `slerp(target)`. A moving 2π target
   * plus shortest-path slerp skips the long way around the ring.
   */
  private applyOrbitSweepPose(): void {
    if (this.orbitSweepProgress >= 1 - 1e-6) {
      this.focusOrientation.copy(this.stableFocusForSweep);
      this.targetFocusOrientation.copy(this.stableFocusForSweep);
      return;
    }
    const angle = this.orbitSweepProgress * Math.PI * 2;
    this.scratchOrbitSpin.setFromAxisAngle(this.orbitSweepAxis, angle);
    // Rest-frame orbit spin, then settled focus — atom travels along its ring.
    this.scratchFocusWithSweep
      .copy(this.stableFocusForSweep)
      .multiply(this.scratchOrbitSpin);
    this.focusOrientation.copy(this.scratchFocusWithSweep);
    this.targetFocusOrientation.copy(this.scratchFocusWithSweep);
  }

  /** Zoom out via `targetZoom → 0`; atom id kept until `zoomProgress` settles near 0. */
  clearZoom(): void {
    this.targetZoom = 0;
  }

  /** Minimal emissive highlight; only one atom at a time. */
  setHighlightedAtom(atomId: string | null): void {
    for (const atom of this.scene.getAtoms()) {
      atom.setHighlighted(atom.id === atomId);
    }
  }

  /** Selection reticle: idle / hover pulse / committed freeze. Dual-state supported. */
  setHaloStates(
    committedAtomId: string | null,
    previewAtomId: string | null,
  ): void {
    for (const atom of this.scene.getAtoms()) {
      if (previewAtomId && atom.id === previewAtomId) {
        atom.setHaloMode('hover');
      } else if (committedAtomId && atom.id === committedAtomId) {
        atom.setHaloMode('committed');
      } else {
        atom.setHaloMode('idle');
      }
    }
  }

  /** @deprecated Prefer `setHaloStates` for dual committed + preview. */
  setHaloAtom(atomId: string | null, mode: HaloMode): void {
    if (mode === 'hover') {
      this.setHaloStates(null, atomId);
    } else if (mode === 'committed') {
      this.setHaloStates(atomId, null);
    } else {
      this.setHaloStates(null, null);
    }
  }

  /** Selected-atom wireframe shell (committed; quality may hide it). */
  setWireframeAtom(atomId: string | null): void {
    this.scene.setWireframeAtom(atomId);
  }

  /** Preview hover or autoplay-next wireframe (static or pulsing). */
  setAccentWireframeAtom(
    atomId: string | null,
    mode: 'static' | 'pulse' | null,
  ): void {
    this.scene.setAccentWireframeAtom(atomId, mode);
  }

  /** Animate hub bond dashes flowing toward the target peripheral atom. */
  setBondFlowAtom(atomId: string | null): void {
    this.scene.setBondFlowAtom(atomId);
  }

  /** White decorative orbit for the active peripheral (others stay black). */
  setActiveOrbitAtom(atomId: string | null): void {
    this.scene.setActiveOrbitAtom(atomId);
  }

  setCaptionsCompact(compact: boolean): void {
    for (const atom of this.scene.getAtoms()) {
      atom.atomLabel.setRemainderVisible(!compact);
    }
  }

  setCaptionRemainderScale(scale: number): void {
    for (const atom of this.scene.getAtoms()) {
      atom.atomLabel.setRemainderScale(scale);
    }
  }

  setCaptionTitleScale(scale: number): void {
    for (const atom of this.scene.getAtoms()) {
      atom.atomLabel.setTitleScale(scale);
    }
  }

  setCaptionBlurbScale(scale: number): void {
    for (const atom of this.scene.getAtoms()) {
      atom.atomLabel.setBlurbScale(scale);
    }
  }

  /** Typewriter blurb under the caption; one atom at a time. */
  setAtomBlurb(atomId: string | null, blurb: string | null): void {
    for (const atom of this.scene.getAtoms()) {
      atom.setBlurb(atom.id === atomId ? blurb : null);
    }
  }

  setAtomCaption(atomId: string, caption: string): void {
    this.scene.getAtom(atomId)?.setCaption(caption);
  }

  setTagCloud(tags: readonly TagCloudItem[]): void {
    this.scene.setTagCloud(tags);
  }

  /** Bright title for committed and/or hover-preview atoms (no blurb required). */
  setAtomTitleHighlight(atomIds: readonly string[]): void {
    const active = new Set(atomIds);
    for (const atom of this.scene.getAtoms()) {
      atom.atomLabel.setTitleActive(active.has(atom.id));
    }
  }

  setAtomLabelVisible(atomId: string, visible: boolean): void {
    this.scene.getAtom(atomId)?.setLabelVisible(visible);
  }

  /**
   * Shifts rest framing from a viewport composition profile.
   * World atom locals stay unchanged; offsets use FOV + aspect + camera axes.
   */
  setCompositionProfile(profile: CompositionProfile): void {
    const same =
      this.compositionProfile.mode === profile.mode &&
      Math.abs(this.compositionProfile.screenX - profile.screenX) < 1e-4 &&
      Math.abs(this.compositionProfile.screenY - profile.screenY) < 1e-4 &&
      Math.abs(this.compositionProfile.approach - profile.approach) < 1e-4;
    this.compositionProfile = profile;
    this.scene.setCompactLayout(profile.mode === 'mobile');
    for (const atom of this.scene.getAtoms()) {
      atom.atomLabel.setBlurbWrapAtSlash(profile.mode === 'mobile');
    }
    if (same) return;
    this.applyCompositionBias();
  }

  /** @deprecated Prefer `setCompositionProfile` — keeps X-only callers working. */
  setCompositionBias(screenX: number): void {
    this.setCompositionProfile({
      ...this.compositionProfile,
      screenX: Math.max(0.35, Math.min(0.75, screenX)),
    });
  }

  /**
   * Projects an atom's world position to CSS pixels in the canvas viewport.
   * Writes into `out`. Returns whether the atom is on-screen.
   */
  projectAtom(atomId: string, out: AtomScreenPoint): boolean {
    const atom = this.scene.getAtom(atomId);
    if (!atom) {
      out.x = 0;
      out.y = 0;
      out.visible = false;
      return false;
    }

    atom.mesh.getWorldPosition(this.scratchAtomPos);
    const { width, height } = getViewportSize();
    const visible = projectToScreenInto(
      this.scratchAtomPos,
      this.scene.camera,
      { width, height },
      this.scratchNdc,
      this.scratchPixels,
    );
    out.x = this.scratchPixels.x;
    out.y = this.scratchPixels.y;
    out.visible = visible;
    return visible;
  }

  onAfterUpdate(listener: AfterUpdateListener): () => void {
    this.afterUpdateListeners.add(listener);
    return () => {
      this.afterUpdateListeners.delete(listener);
    };
  }

  /**
   * Frame-rate independent layer follow, then compose onto the group.
   * `final = appliedFocus * mouseOrientation * baseOrientation`
   * where `appliedFocus = slerp(I, focusOrientation, focusStrength)`.
   * Under focus, spin / gyro amplitude scales toward `MOUSE_UNDER_FOCUS` /
   * `GYRO_UNDER_FOCUS` (secondary motion).
   * Zoom writes `moleculeGroup.position` only — not mixed into quaternion layers.
   *
   * Update layers (do not mix):
   * - PER FRAME: spin integrate, quaternion follow, zoom translation, one matrix update
   * - POINTER: raycast when AtomHover is dirty (pointermove / resize / pose change)
   * - TRANSFORM DEPENDENT: labels when orientation / zoom / fill changed
   * - STATE DRIVEN: highlight / selection / wireframe / blurb from NavigationState
   * - DECORATIVE: selection pulse (early-out when idle); ghost layer zoom-fades
   */
  update(delta: number): void {
    const strengthT = 1 - Math.exp(-FOCUS_STRENGTH_FOLLOW * delta);
    this.focusStrength += (this.targetFocusStrength - this.focusStrength) * strengthT;

    if (this.orbitSweepActive) {
      this.applyOrbitSweepPose();
    } else {
      const focusOrientT = 1 - Math.exp(-FOCUS_ORIENT_FOLLOW * delta);
      this.focusOrientation.slerp(this.targetFocusOrientation, focusOrientT);
    }

    if (this.frozen) {
      this.mouseOrientation.identity();
      this.targetMouseOrientation.identity();
      this.spinOrientation.identity();
    } else {
      const mouseScale =
        1 - this.focusStrength * (1 - MOUSE_UNDER_FOCUS);
      const gyroScale =
        1 - this.focusStrength * (1 - GYRO_UNDER_FOCUS);

      if (
        this.hasFinePointer &&
        !this.reducedMotion &&
        !this.isSpinPausedByHover()
      ) {
        this.pointerNorm.x = this.pointerNdc.x - this.spinOriginNdc.x;
        this.pointerNorm.y = this.pointerNdc.y - this.spinOriginNdc.y;
        const radius = Math.hypot(this.pointerNorm.x, this.pointerNorm.y);
        const omega =
          spinSpeedFromRadius(radius, this.spinSpeedLimits) * mouseScale;
        if (omega > SPIN_OMEGA_EPS) {
          const camera = this.scene.camera;
          camera.updateMatrixWorld(true);
          this.scratchCameraRight
            .setFromMatrixColumn(camera.matrixWorld, 0)
            .normalize();
          this.scratchCameraUp
            .setFromMatrixColumn(camera.matrixWorld, 1)
            .normalize();
          if (
            spinAxisScreenPerpendicular(
              this.pointerNorm.x,
              this.pointerNorm.y,
              this.scratchCameraRight,
              this.scratchCameraUp,
              this.scratchSpinAxis,
            )
          ) {
            // World/screen axis through the group origin; conjugate into the
            // mouse layer so `focus * mouse` still rotates about that axis.
            this.scratchAppliedFocus.slerpQuaternions(
              this.scratchIdentity,
              this.focusOrientation,
              this.focusStrength,
            );
            this.scratchYaw.copy(this.scratchAppliedFocus).invert();
            this.scratchSpinAxis.applyQuaternion(this.scratchYaw);
            integrateSpin(
              this.spinOrientation,
              this.scratchSpinAxis,
              -omega * delta,
              this.scratchSpinDelta,
            );
          }
        }
      }

      this.applyMouseTarget(gyroScale);
      const mouseT = 1 - Math.exp(-MOUSE_FOLLOW * delta);
      this.mouseOrientation.slerp(this.targetMouseOrientation, mouseT);
    }

    this.updateZoomProgress(delta);

    this.scratchAppliedFocus.slerpQuaternions(
      this.scratchIdentity,
      this.focusOrientation,
      this.focusStrength,
    );

    this.scratchCompose
      .copy(this.scratchAppliedFocus)
      .multiply(this.mouseOrientation)
      .multiply(this.baseOrientation);
    this.scene.moleculeGroup.quaternion.copy(this.scratchCompose);

    this.applyZoomTranslation();
    this.scene.setDecorativeZoomFade(this.zoomProgress, this.fillProgress, {
      keepOrbitsVisible:
        this.frozen && this.isAtApproach() && !this.approachBusy,
    });

    // One forced matrix pass after all transforms — labels + hover consume it.
    this.scene.moleculeGroup.updateMatrixWorld(true);
    this.refreshSpinOriginNdc();
    this.refreshSpinExtentNdc();

    const updateLabels =
      !this.lastLabelQuaternion.equals(this.scratchCompose) ||
      this.lastLabelZoomProgress !== this.zoomProgress ||
      this.lastLabelFillProgress !== this.fillProgress;
    if (updateLabels) {
      this.lastLabelQuaternion.copy(this.scratchCompose);
      this.lastLabelZoomProgress = this.zoomProgress;
      this.lastLabelFillProgress = this.fillProgress;
    }

    this.elapsed += delta;
    this.scene.update(delta, updateLabels, this.elapsed);
    if (!this.frozen && !this.touchInput) {
      if (!this.lastHoverQuaternion.equals(this.scratchCompose)) {
        this.lastHoverQuaternion.copy(this.scratchCompose);
        this.atomHover.markDirty();
      }
      this.updateHover();
    }

    for (const listener of this.afterUpdateListeners) {
      listener(delta);
    }
  }

  /** Settled off-home freeze: dim chrome; busy approach or home: base colors. */
  private syncChromeDim(): void {
    this.scene.setChromeDimmed(this.frozen && !this.approachBusy);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('orientationchange', this.onOrientationChangeBound);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', this.onResizeBound);
      vv.addEventListener('scroll', this.onResizeBound);
    }
    window.addEventListener('pointermove', this.onPointerMoveBound);
    document.addEventListener('pointerleave', this.onPointerLeaveBound);
    this.canvas.addEventListener('click', this.onClickBound);
    this.canvas.addEventListener('pointerdown', this.onPointerDownBound);
    this.canvas.addEventListener('pointerup', this.onPointerUpBound);
    this.canvas.addEventListener('pointercancel', this.onPointerCancelBound);
    this.canvas.style.touchAction = 'none';
    document.addEventListener('visibilitychange', this.onVisibilityBound);
    this.onResizeBound();
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
    this.syncGyroBinding();
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.unbindGyro();
    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('orientationchange', this.onOrientationChangeBound);
    const vv = window.visualViewport;
    if (vv) {
      vv.removeEventListener('resize', this.onResizeBound);
      vv.removeEventListener('scroll', this.onResizeBound);
    }
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    document.removeEventListener('pointerleave', this.onPointerLeaveBound);
    document.removeEventListener('visibilitychange', this.onVisibilityBound);
    this.canvas.removeEventListener('click', this.onClickBound);
    this.canvas.removeEventListener('pointerdown', this.onPointerDownBound);
    this.canvas.removeEventListener('pointerup', this.onPointerUpBound);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancelBound);
    cancelAnimationFrame(this.rafId);
  }

  dispose(): void {
    this.stop();
    this.unsubscribeQuality();
    this.unsubscribeReducedMotion();
    this.unsubscribePointerInput();
    this.atomClickListeners.clear();
    this.afterUpdateListeners.clear();
    this.scene.dispose();
  }

  private getHubAtomId(): string {
    for (const atom of this.scene.getAtoms()) {
      if (atom.object.position.lengthSq() < 1e-12) return atom.id;
    }
    return hubAtomId();
  }

  private syncReducedMotionVisuals(): void {
    if (!this.reducedMotion) return;
    this.hasFinePointer = false;
    this.targetMouseOrientation.copy(this.baseOrientation);
    this.mouseOrientation.copy(this.baseOrientation);
    this.spinOrientation.identity();
    this.gyroYaw = 0;
    this.gyroPitch = 0;
    this.gyroCalibrated = false;
    for (const atom of this.scene.getAtoms()) {
      atom.selection.setSimple(true);
    }
  }

  /**
   * Zoom-in waits until focus orientation has settled; zoom-out always runs.
   * Skipped while `Navigator` drives zoom via `setZoomProgress`.
   */
  private updateZoomProgress(delta: number): void {
    if (this.transitionDriven) {
      return;
    }

    const zoomingIn = this.targetZoom > this.zoomProgress;
    if (zoomingIn && !this.isFocusReadyForZoom()) {
      return;
    }

    const zoomT = 1 - Math.exp(-ZOOM_FOLLOW * delta);
    this.zoomProgress += (this.targetZoom - this.zoomProgress) * zoomT;

    if (this.targetZoom === 0 && this.zoomProgress < 1e-4) {
      this.zoomProgress = 0;
      this.zoomAtomId = null;
    }
  }

  /**
   * True when focus strength and orientation have settled on the target.
   * Shared gate for zoom-in and HUD USP reveal.
   */
  isFocusSettled(): boolean {
    if (this.focusStrength < ZOOM_FOCUS_STRENGTH_GATE) return false;
    return this.focusOrientation.angleTo(this.targetFocusOrientation) <= ZOOM_FOCUS_ANGLE_GATE;
  }

  private isFocusReadyForZoom(): boolean {
    return this.isFocusSettled();
  }

  /**
   * Writes `baseMoleculePosition` from composition profile using FOV + aspect.
   * Does not read CSS layout.
   */
  private applyCompositionBias(): void {
    const camera = this.scene.camera;
    camera.updateMatrixWorld(true);
    this.scratchCameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    this.scratchCameraUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    camera.getWorldDirection(this.scratchLookDir);

    const dist = camera.position.distanceTo(this.compositionLookAt);
    const vFov = (camera.fov * Math.PI) / 180;
    const halfH = Math.tan(vFov / 2) * dist;
    const halfW = halfH * camera.aspect;
    const activeFraming = this.compositionFramingOverride ?? this.compositionProfile;
    const restFraming =
      this.uniformScreenDrift && this.zoomProgress > 0
        ? CENTER_FRAMING
        : activeFraming;
    const ndcX = (restFraming.screenX - 0.5) * 2;
    const ndcY = (0.5 - restFraming.screenY) * 2;

    // Positive approach pulls toward the camera (larger on-screen presence).
    this.baseMoleculePosition
      .set(0, 0, 0)
      .addScaledVector(this.scratchCameraRight, ndcX * halfW)
      .addScaledVector(this.scratchCameraUp, ndcY * halfH)
      .addScaledVector(this.scratchLookDir, -restFraming.approach);

    // Apply immediately when not mid-zoom; zoom path recomposes each frame.
    if (!this.zoomAtomId || this.zoomProgress <= 0) {
      this.scene.moleculeGroup.position.copy(this.baseMoleculePosition);
    }
  }

  /**
   * Translates `moleculeGroup` so the zoom atom approaches the camera look axis
   * at `getAtomFocusDistance`, offset to the active zoom-target framing.
   * Camera FOV / position stay fixed.
   */
  private applyZoomTranslation(): void {
    const group = this.scene.moleculeGroup;

    if (!this.zoomAtomId || this.zoomProgress <= 0) {
      group.position.copy(this.baseMoleculePosition);
      return;
    }

    const atom = this.scene.getAtom(this.zoomAtomId);
    if (!atom) {
      group.position.copy(this.baseMoleculePosition);
      return;
    }

    // Measure atom world position at rest translation + current orientation.
    group.position.copy(this.baseMoleculePosition);
    group.updateMatrixWorld(true);
    atom.mesh.getWorldPosition(this.scratchAtomPos);

    const camera = this.scene.camera;
    camera.updateMatrixWorld(true);
    camera.getWorldPosition(this.scratchCameraPos);
    camera.getWorldDirection(this.scratchLookDir);
    this.scratchCameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    this.scratchCameraUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();

    const zoomFraming = this.getZoomTargetFraming();
    const mode = this.compositionProfile.mode;
    let fillScale = approachFillScaleForFraming(zoomFraming, mode);
    const fillTarget = fillViewportTargetForMode(this.compositionProfile.mode);
    const viewportFill =
      (ZOOM_VIEWPORT_FILL +
        (fillTarget - ZOOM_VIEWPORT_FILL) * this.fillProgress) *
      fillScale;

    let focusDistance: number;
    if (
      this.transitionDriven &&
      this.retargetFromFraming &&
      this.focusedAtomId
    ) {
      const targetFraming = approachFramingForAtom(this.focusedAtomId);
      fillScale = retargetFillScale(
        this.retargetFromFraming,
        targetFraming,
        zoomFraming,
        mode,
      );
      const blendedFill =
        (ZOOM_VIEWPORT_FILL +
          (fillTarget - ZOOM_VIEWPORT_FILL) * this.fillProgress) *
        fillScale;
      focusDistance = retargetFocusDistance(
        atom.radius,
        camera,
        this.retargetFromFraming,
        targetFraming,
        zoomFraming,
        blendedFill,
      );
    } else {
      focusDistance = getAtomFocusDistance(
        atom.radius,
        camera,
        approachFocusDistanceOptions(
          atom.radius,
          camera,
          zoomFraming,
          viewportFill,
        ),
      );
    }

    const vFov = (camera.fov * Math.PI) / 180;
    const halfH = Math.tan(vFov / 2) * focusDistance;
    const halfW = halfH * camera.aspect;
    const ndcX = (zoomFraming.screenX - 0.5) * 2;
    const ndcY = (0.5 - zoomFraming.screenY) * 2;

    // Desired: atom center at viewport fraction on the focus plane.
    this.scratchMoleculePos
      .copy(this.scratchCameraPos)
      .addScaledVector(this.scratchLookDir, focusDistance)
      .addScaledVector(this.scratchCameraRight, ndcX * halfW)
      .addScaledVector(this.scratchCameraUp, ndcY * halfH)
      .addScaledVector(this.scratchLookDir, -zoomFraming.approach);

    this.scratchZoomOffset.copy(this.scratchMoleculePos).sub(this.scratchAtomPos);

    if (this.uniformScreenDrift && this.zoomProgress > 0) {
      // Screen XY follows framing at full weight; zoomProgress scales depth only.
      const depthAlong = this.scratchZoomOffset.dot(this.scratchLookDir);
      this.scratchZoomOffset.addScaledVector(
        this.scratchLookDir,
        -depthAlong * (1 - this.zoomProgress),
      );
      group.position.copy(this.baseMoleculePosition).add(this.scratchZoomOffset);
      return;
    }

    group.position
      .copy(this.baseMoleculePosition)
      .addScaledVector(this.scratchZoomOffset, this.zoomProgress);
  }

  private updateHover(): void {
    // World matrices already refreshed once this frame in `update`.
    this.atomHover.update(this.scene.camera, this.scene.getAtomMeshes());
  }

  /** Desktop spin stops on peripheral hover; hub and the focused atom keep spinning. */
  private isSpinPausedByHover(): boolean {
    const hovered = this.atomHover.getHoveredAtomId();
    if (!hovered) return false;
    if (hovered === this.getHubAtomId()) return false;
    if (hovered === this.focusedAtomId) return false;
    return true;
  }

  private readonly tick = (time: number): void => {
    if (!this.running) return;
    const deltaSeconds = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.update(deltaSeconds);
    this.scene.render();
    this.sampler.tick(deltaSeconds);
    if (!this.gyroBound && this.sampler.done) {
      this.syncGyroBinding();
    }
    this.rafId = requestAnimationFrame(this.tick);
  };
};
