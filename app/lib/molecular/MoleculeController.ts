import { Quaternion, Vector2, Vector3 } from 'three';
import { AtomHover, type AtomHoverListener } from './AtomHover';
import type { HaloMode } from './AtomSelectionIndicator';
import {
  COMPOSITION_PROFILES,
  type CompositionProfile,
} from './composition/profiles';
import { getStableFocusQuaternion } from './math/focusAtom';
import {
  getAtomFocusDistance,
  type AtomFocusDistanceOptions,
} from './math/getAtomFocusDistance';
import { projectToScreenInto } from './math/projection';
import { moleculeConfig } from './moleculeConfig';
import { MoleculeScene } from './MoleculeScene';
import { PerformanceSampler } from './quality/PerformanceSampler';
import type { QualityManager } from './quality/QualityManager';
import { readQualitySearchParam } from './quality/QualityManager';

/** Limited yaw / pitch from pointer (radians) — not a full turn. */
const MAX_YAW = Math.PI / 5;
const MAX_PITCH = Math.PI / 7;

/** Movement below this (CSS px) counts as tap; above as drag. */
const TAP_MOVE_THRESHOLD_PX = 10;

/** Touch drag sensitivity relative to canvas size → full max tilt. */
const TOUCH_DRAG_GAIN = 1.35;

/** Higher = snappier slerp toward `targetMouseOrientation`. */
const MOUSE_FOLLOW = 6;

/**
 * Mouse amplitude scale at `focusStrength = 1`.
 * Focus orientation stays dominant; pointer remains a subtle secondary tilt.
 */
const MOUSE_UNDER_FOCUS = 0.22;

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
const FILL_VIEWPORT_FILL = 1.35;

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
  /** Normalized X in [-1, 1]; 0 = screen center. */
  x: number;
  /** Normalized Y in [-1, 1]; 0 = screen center; +Y = up. */
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

  /** Rest pose (identity for now). Absolute — never accumulated. */
  private readonly baseOrientation = new Quaternion();

  /** Smoothed limited pointer tilt. */
  private readonly mouseOrientation = new Quaternion();

  /** Absolute mouse target from the latest pointer sample. */
  private readonly targetMouseOrientation = new Quaternion();

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

  /** Rest translation of `moleculeGroup` (zoom offset is applied on top). */
  private readonly baseMoleculePosition = new Vector3();

  /**
   * Desired visual center of the molecule as viewport fractions + approach.
   * Applied via world offset along camera axes — never reads CSS sidebar width.
   */
  private compositionProfile: CompositionProfile = COMPOSITION_PROFILES.mobile;

  /** Look-at used for composition distance (matches MoleculeScene camera). */
  private readonly compositionLookAt = new Vector3(0, 0.2, 0);

  /** Accumulated touch-drag yaw / pitch (clamped to MAX_*). */
  private dragYaw = 0;
  private dragPitch = 0;

  /** Atom id last passed to `focusAtom` while focus is active. */
  private focusedAtomId: string | null = null;

  private touchPointerId: number | null = null;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchLastX = 0;
  private touchLastY = 0;
  private touchDragging = false;
  private suppressNextClick = false;

  /** Last orientation used for hover picking — dirty when it diverges. */
  private readonly lastHoverQuaternion = new Quaternion();

  /** Last zoom progress sampled for hover dirtying. */
  private lastHoverZoomProgress = 0;

  /**
   * Last pose used for label billboards.
   * Starts as (0,0,0,0) so the first frame always updates labels.
   */
  private readonly lastLabelQuaternion = new Quaternion(0, 0, 0, 0);

  private lastLabelZoomProgress = Number.NaN;
  private lastLabelFillProgress = Number.NaN;

  /** Reused options bag for `getAtomFocusDistance` (no per-frame alloc). */
  private readonly focusDistanceOptions: AtomFocusDistanceOptions = {
    viewportFill: ZOOM_VIEWPORT_FILL,
  };

  private readonly scratchYaw = new Quaternion();
  private readonly scratchPitch = new Quaternion();
  private readonly scratchIdentity = new Quaternion();
  private readonly scratchAppliedFocus = new Quaternion();
  private readonly scratchAttenuatedMouse = new Quaternion();
  private readonly scratchCompose = new Quaternion();
  private readonly scratchMoleculePos = new Vector3();
  private readonly scratchAtomPos = new Vector3();
  private readonly scratchCameraPos = new Vector3();
  private readonly scratchLookDir = new Vector3();
  private readonly scratchZoomOffset = new Vector3();
  private readonly scratchCameraRight = new Vector3();
  private readonly scratchCameraUp = new Vector3();
  private readonly scratchRandomAxis = new Vector3();
  private readonly scratchHalfTurn = new Quaternion();
  private readonly pointerNorm: PointerNorm = { x: 0, y: 0 };
  private readonly atomHover = new AtomHover();
  private readonly atomClickListeners = new Set<AtomClickListener>();
  private readonly afterUpdateListeners = new Set<AfterUpdateListener>();
  private readonly scratchNdc = new Vector2();
  private readonly scratchPixels = new Vector2();
  private elapsed = 0;

  private rafId = 0;
  private lastTime = 0;
  private running = false;
  private readonly canvas: HTMLCanvasElement;
  private readonly sampler: PerformanceSampler;
  private readonly unsubscribeQuality: () => void;
  private readonly onResizeBound: () => void;
  private readonly onPointerMoveBound: (event: PointerEvent) => void;
  private readonly onPointerLeaveBound: () => void;
  private readonly onClickBound: (event: MouseEvent) => void;
  private readonly onPointerDownBound: (event: PointerEvent) => void;
  private readonly onPointerUpBound: (event: PointerEvent) => void;
  private readonly onPointerCancelBound: (event: PointerEvent) => void;

  constructor(canvas: HTMLCanvasElement, quality: QualityManager) {
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
    });

    this.onResizeBound = () => {
      const { width, height } = getViewportSize();
      this.scene.resize(width, height);
      this.applyCompositionBias();
      // Aspect / projection changed — refresh pick and label billboards.
      this.atomHover.markDirty();
      this.lastLabelZoomProgress = Number.NaN;
    };

    this.onPointerMoveBound = (event: PointerEvent) => {
      if (this.touchPointerId !== null) {
        this.handleTouchMove(event);
        return;
      }
      if (event.pointerType === 'touch' || event.pointerType === 'pen') {
        return;
      }
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.max(rect.width, 1);
      const h = Math.max(rect.height, 1);
      const fracX = (event.clientX - rect.left) / w;
      const fracY = (event.clientY - rect.top) / h;
      // Pick / hover use true viewport NDC (screen center).
      const ndcX = fracX * 2 - 1;
      const ndcY = -(fracY * 2 - 1);
      // Mouse tilt origin follows composition bias (visual molecule center).
      this.pointerNorm.x = (fracX - this.compositionProfile.screenX) * 2;
      this.pointerNorm.y =
        (this.compositionProfile.screenY - fracY) * 2;
      this.updateMouseInfluence(this.pointerNorm);
      this.syncDragAnglesFromPointer(this.pointerNorm);
      this.atomHover.setPointerNdc(ndcX, ndcY);
    };

    this.onPointerLeaveBound = () => {
      if (this.touchPointerId !== null) return;
      this.atomHover.clear();
    };

    this.onClickBound = (event: MouseEvent) => {
      if (this.suppressNextClick) {
        this.suppressNextClick = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      this.emitPickAtClient(event.clientX, event.clientY);
    };

    this.onPointerDownBound = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      if (this.touchPointerId !== null) return;
      this.touchPointerId = event.pointerId;
      this.touchStartX = event.clientX;
      this.touchStartY = event.clientY;
      this.touchLastX = event.clientX;
      this.touchLastY = event.clientY;
      this.touchDragging = false;
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
      }
    };

    this.onPointerCancelBound = (event: PointerEvent) => {
      if (event.pointerId !== this.touchPointerId) return;
      this.endTouchGesture(event.pointerId);
      this.suppressNextClick = true;
    };
  }

  private handleTouchMove(event: PointerEvent): void {
    if (event.pointerId !== this.touchPointerId) return;
    const dx = event.clientX - this.touchStartX;
    const dy = event.clientY - this.touchStartY;
    if (!this.touchDragging) {
      if (Math.hypot(dx, dy) < TAP_MOVE_THRESHOLD_PX) return;
      this.touchDragging = true;
    }

    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(rect.width, 1);
    const h = Math.max(rect.height, 1);
    const stepX = event.clientX - this.touchLastX;
    const stepY = event.clientY - this.touchLastY;
    this.touchLastX = event.clientX;
    this.touchLastY = event.clientY;

    this.dragYaw += (stepX / w) * MAX_YAW * TOUCH_DRAG_GAIN * 2;
    this.dragPitch += (stepY / h) * MAX_PITCH * TOUCH_DRAG_GAIN * 2;
    this.dragYaw = Math.max(-MAX_YAW, Math.min(MAX_YAW, this.dragYaw));
    this.dragPitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.dragPitch));
    this.applyDragOrientation();
    event.preventDefault();
  }

  private endTouchGesture(pointerId: number): void {
    if (this.canvas.hasPointerCapture(pointerId)) {
      this.canvas.releasePointerCapture(pointerId);
    }
    this.touchPointerId = null;
    this.touchDragging = false;
  }

  private emitPickAtClient(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
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

  private syncDragAnglesFromPointer(pointer: PointerNorm): void {
    this.dragYaw = Math.max(-1, Math.min(1, pointer.x)) * MAX_YAW;
    this.dragPitch = Math.max(-1, Math.min(1, pointer.y)) * MAX_PITCH;
  }

  private applyDragOrientation(): void {
    this.scratchYaw.setFromAxisAngle(AXIS_Y, this.dragYaw);
    this.scratchPitch.setFromAxisAngle(AXIS_X, this.dragPitch);
    this.targetMouseOrientation.copy(this.scratchYaw).multiply(this.scratchPitch);
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

  /**
   * Sets `targetFocusOrientation` so the atom faces the camera and raises focus strength.
   * Uses rest-frame atom position (local + molecule translation) so the result
   * is an absolute focus orientation, independent of the mouse layer.
   * Twist/roll is locked relative to the current `focusOrientation`.
   *
   * Hub / Home (zero offset): no unique forward — on enter, apply a π flip about
   * a random axis so the molecule turns and the core is not left “behind” the pose.
   * Clears residual pointer/touch tilt so the focused atom actually faces the camera.
   */
  focusAtom(atomId: string): void {
    const atom = this.scene.getAtom(atomId);
    if (!atom) return;

    const alreadyFocused =
      this.focusedAtomId === atomId && this.targetFocusStrength > 0.5;

    // Rest-frame molecule origin (ignore live zoom translation).
    this.scratchMoleculePos.copy(this.baseMoleculePosition);
    // Rest pose: ignore current group rotation so focus Q stays absolute.
    this.scratchAtomPos.copy(atom.object.position).add(this.scratchMoleculePos);

    if (atom.object.position.lengthSq() < 1e-12) {
      // Center atom: keep target if already focused; otherwise half-turn the molecule.
      if (!alreadyFocused) {
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

    // Drop leftover touch drag / mouse tilt so focus lands on the look axis.
    // Fine pointers rewrite tilt on the next `pointermove`.
    if (!alreadyFocused) {
      this.resetPointerTilt();
    }
  }

  /** Fade focus influence out via `focusStrength` → 0; keep last focus pose. */
  clearFocus(): void {
    this.targetFocusStrength = 0;
    this.focusedAtomId = null;
  }

  /** Clears accumulated yaw/pitch and both mouse orientation layers. */
  private resetPointerTilt(): void {
    this.dragYaw = 0;
    this.dragPitch = 0;
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

  /** Selection reticle: idle / hover pulse / committed freeze. One atom at a time. */
  setHaloAtom(atomId: string | null, mode: HaloMode): void {
    for (const atom of this.scene.getAtoms()) {
      atom.setHaloMode(atom.id === atomId ? mode : 'idle');
    }
  }

  /** Selected-atom wireframe shell (committed only; quality may hide it). */
  setWireframeAtom(atomId: string | null): void {
    this.scene.setWireframeAtom(atomId);
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

  /** Typewriter blurb under the caption; one atom at a time. */
  setAtomBlurb(atomId: string | null, blurb: string | null): void {
    for (const atom of this.scene.getAtoms()) {
      atom.setBlurb(atom.id === atomId ? blurb : null);
    }
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
   * Maps normalized pointer [-1, 1] into a limited yaw/pitch target (no Euler).
   * (0, 0) is the composition bias (visual molecule center), not screen center.
   * Absolute rewrite — not accumulated.
   */
  updateMouseInfluence(pointer: PointerNorm): void {
    const nx = Math.max(-1, Math.min(1, pointer.x));
    const ny = Math.max(-1, Math.min(1, pointer.y));
    this.scratchYaw.setFromAxisAngle(AXIS_Y, nx * MAX_YAW);
    this.scratchPitch.setFromAxisAngle(AXIS_X, ny * MAX_PITCH);
    // Yaw then pitch ≈ prior YXZ limited tilt.
    this.targetMouseOrientation.copy(this.scratchYaw).multiply(this.scratchPitch);
  }

  /**
   * Frame-rate independent layer follow, then compose onto the group.
   * `final = appliedFocus * mouseOrientation * baseOrientation`
   * where `appliedFocus = slerp(I, focusOrientation, focusStrength)`.
   * Under focus, mouse amplitude scales toward `MOUSE_UNDER_FOCUS` (secondary tilt).
   * Zoom writes `moleculeGroup.position` only — not mixed into quaternion layers.
   *
   * Update layers (do not mix):
   * - PER FRAME: quaternion follow, zoom translation, one matrix update
   * - POINTER: raycast only when AtomHover is dirty
   * - TRANSFORM DEPENDENT: labels when orientation / zoom / fill changed
   * - STATE DRIVEN: highlight / selection / wireframe / blurb from NavigationState
   * - DECORATIVE: selection pulse (early-out when idle); ghost layer zoom-fades
   */
  update(delta: number): void {
    const focusOrientT = 1 - Math.exp(-FOCUS_ORIENT_FOLLOW * delta);
    this.focusOrientation.slerp(this.targetFocusOrientation, focusOrientT);

    const strengthT = 1 - Math.exp(-FOCUS_STRENGTH_FOLLOW * delta);
    this.focusStrength += (this.targetFocusStrength - this.focusStrength) * strengthT;

    // Focus dominant: shrink pointer tilt as focusStrength rises (never zero).
    const mouseScale =
      1 - this.focusStrength * (1 - MOUSE_UNDER_FOCUS);
    this.scratchAttenuatedMouse.slerpQuaternions(
      this.scratchIdentity,
      this.targetMouseOrientation,
      mouseScale,
    );
    const mouseT = 1 - Math.exp(-MOUSE_FOLLOW * delta);
    this.mouseOrientation.slerp(this.scratchAttenuatedMouse, mouseT);

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
    this.scene.setDecorativeZoomFade(this.zoomProgress, this.fillProgress);

    // One forced matrix pass after all transforms — labels + hover consume it.
    this.scene.moleculeGroup.updateMatrixWorld(true);

    // Molecule moved under a still pointer → need a fresh pick (not every idle frame).
    if (
      !this.lastHoverQuaternion.equals(this.scratchCompose) ||
      this.lastHoverZoomProgress !== this.zoomProgress
    ) {
      this.lastHoverQuaternion.copy(this.scratchCompose);
      this.lastHoverZoomProgress = this.zoomProgress;
      this.atomHover.markDirty();
    }

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
    this.updateHover();

    for (const listener of this.afterUpdateListeners) {
      listener(delta);
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('orientationchange', this.onResizeBound);
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
    this.onResizeBound();
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('orientationchange', this.onResizeBound);
    const vv = window.visualViewport;
    if (vv) {
      vv.removeEventListener('resize', this.onResizeBound);
      vv.removeEventListener('scroll', this.onResizeBound);
    }
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    document.removeEventListener('pointerleave', this.onPointerLeaveBound);
    this.canvas.removeEventListener('click', this.onClickBound);
    this.canvas.removeEventListener('pointerdown', this.onPointerDownBound);
    this.canvas.removeEventListener('pointerup', this.onPointerUpBound);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancelBound);
    cancelAnimationFrame(this.rafId);
  }

  dispose(): void {
    this.stop();
    this.unsubscribeQuality();
    this.atomClickListeners.clear();
    this.afterUpdateListeners.clear();
    this.scene.dispose();
  }

  /**
   * Zoom-in waits until focus orientation has settled; zoom-out always runs.
   * Skipped while `Navigator` drives zoom via `setZoomProgress`.
   */
  private updateZoomProgress(delta: number): void {
    if (this.transitionDriven) {
      if (this.targetZoom === 0 && this.zoomProgress < 1e-4) {
        this.zoomProgress = 0;
        this.zoomAtomId = null;
      }
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
    const ndcX = (this.compositionProfile.screenX - 0.5) * 2;
    const ndcY = (0.5 - this.compositionProfile.screenY) * 2;

    // Positive approach pulls toward the camera (larger on-screen presence).
    this.baseMoleculePosition
      .set(0, 0, 0)
      .addScaledVector(this.scratchCameraRight, ndcX * halfW)
      .addScaledVector(this.scratchCameraUp, ndcY * halfH)
      .addScaledVector(this.scratchLookDir, -this.compositionProfile.approach);

    // Apply immediately when not mid-zoom; zoom path recomposes each frame.
    if (!this.zoomAtomId || this.zoomProgress <= 0) {
      this.scene.moleculeGroup.position.copy(this.baseMoleculePosition);
    }
  }

  /**
   * Translates `moleculeGroup` so the zoom atom approaches the camera look axis
   * at `getAtomFocusDistance`. Camera FOV / position stay fixed.
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

    this.scene.camera.getWorldPosition(this.scratchCameraPos);
    this.scene.camera.getWorldDirection(this.scratchLookDir);

    this.focusDistanceOptions.viewportFill =
      ZOOM_VIEWPORT_FILL +
      (FILL_VIEWPORT_FILL - ZOOM_VIEWPORT_FILL) * this.fillProgress;
    const focusDistance = getAtomFocusDistance(
      atom.radius,
      this.scene.camera,
      this.focusDistanceOptions,
    );
    // Desired: atom centered on the look axis at the framing distance.
    this.scratchZoomOffset
      .copy(this.scratchCameraPos)
      .addScaledVector(this.scratchLookDir, focusDistance)
      .sub(this.scratchAtomPos);

    group.position
      .copy(this.baseMoleculePosition)
      .addScaledVector(this.scratchZoomOffset, this.zoomProgress);
  }

  private updateHover(): void {
    // World matrices already refreshed once this frame in `update`.
    this.atomHover.update(this.scene.camera, this.scene.getAtomMeshes());
  }

  private readonly tick = (time: number): void => {
    if (!this.running) return;
    const deltaSeconds = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.update(deltaSeconds);
    this.scene.render();
    this.sampler.tick(deltaSeconds);
    this.rafId = requestAnimationFrame(this.tick);
  };
};
