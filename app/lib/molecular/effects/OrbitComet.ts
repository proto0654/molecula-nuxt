import {
  AdditiveBlending,
  Color,
  LineLoop,
  Quaternion,
  ShaderMaterial,
  type Group,
} from 'three';
import { ATOM_ORBIT_PLACEMENT, orbitQuaternion } from '../moleculeOrbits';
import type { GeometryCache } from '../resources/GeometryCache';
import { ACCENT_COLOR } from '../sceneColors';
import type { QualitySettings } from '../quality/types';

const TAU = Math.PI * 2;
/** Arc length behind the head, radians (≈ 24° of the ring). */
const COMET_TAIL = 0.42;
/**
 * One full revolution per active-atom cycle. `HeroAutoplay` slide is ~5.5s;
 * the comet laps the ring exactly once in that window.
 */
const COMET_CYCLE_SECONDS = 5.5;
const COMET_SPEED = TAU / COMET_CYCLE_SECONDS;
/** Quick unfurl at the atom so the head is visible from the first frames. */
const COMET_GROW_SECONDS = 0.55;

const vertexShader = /* glsl */ `
  varying vec2 vLocal;

  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uHead;
  uniform float uTail;
  /** 0 → 1 arc growth measured backward from the head. */
  uniform float uProgress;

  varying vec2 vLocal;

  void main() {
    float angle = atan(vLocal.y, vLocal.x);
    // Positive distance *behind* the head, so the bright head leads and the
    // tapering tail trails in the direction of travel.
    float behind = mod(uHead - angle + 6.28318530718, 6.28318530718);
    float tail = 1.0 - smoothstep(0.0, uTail, behind);
    float body = tail * tail;
    // Arc exists only behind the head, limited by how far it has grown.
    if (behind > uProgress * 6.28318530718) discard;
    // Fade the very tip so the leading edge dissolves instead of stopping.
    float tipFade = 1.0 - smoothstep(uTail * 0.55, uTail, behind);
    float alpha = body * tipFade * uOpacity;
    if (alpha <= 0.003) discard;
    gl_FragColor = vec4(uColor, alpha);
    #include <colorspace_fragment>
  }
`;

/**
 * Comet on the decorative orbit of the **upcoming** atom (hover / next).
 *
 * Contract:
 * - It appears on the same frame the target changes — before the atom's
 *   commit turn finishes, together with the dust front, never after it.
 * - It is (re)born at the atom's own orbital angle, so the motion always
 *   starts *from* that atom, never somewhere mid-ring.
 * - The head laps the ring exactly once per active-atom cycle
 *   (`COMET_CYCLE_SECONDS`), so the loop is in phase with autoplay.
 *
 * Note: the approach pose spins the focused atom toward the viewer and its
 * orbit can collapse to an edge-on line there, so callers point the comet at
 * the *next* atom, not the committed one.
 *
 * The same instance also flies the home boot chain through `setBootArc`: the
 * intro clock then owns head / length / opacity, and the target loop is frozen
 * until the boot hands back.
 */

/** Explicit arc for the home boot — head / length / opacity from the intro. */
type BootArc = {
  /** Ring-frame head angle (rad). */
  head: number;
  /** Arc length behind the head, turns (0..1). */
  progress: number;
  opacity: number;
};

export class OrbitComet {
  private readonly line: LineLoop;
  private readonly material: ShaderMaterial;
  private readonly scratchQ = new Quaternion();
  private activeAtomId: string | null = null;
  private layoutScale = 1;
  private enabled = true;
  private intensity = 1;
  /** Orbital angle of the target atom — the comet's birth point. */
  private birthAngle = 0;
  /** Seconds since the arc was born. */
  private age = 0;
  /** Home boot arc; while set, the target loop is frozen. */
  private bootArc: BootArc | null = null;
  private readonly scratchBoot: BootArc = {
    head: 0,
    progress: 0,
    opacity: 0,
  };

  constructor(
    cache: GeometryCache,
    parent: Group,
    settings: QualitySettings,
  ) {
    this.enabled = settings.orbitComet;
    this.material = new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(ACCENT_COLOR) },
        uOpacity: { value: 0 },
        uHead: { value: 0 },
        uTail: { value: COMET_TAIL },
        uProgress: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
    });

    this.line = new LineLoop(cache.getUnitCircle(), this.material);
    this.line.name = 'orbit-comet';
    this.line.raycast = () => {};
    this.line.frustumCulled = false;
    this.line.renderOrder = 2;
    this.line.visible = false;
    parent.add(this.line);
  }

  /** Seconds per revolution — exposed so callers can phase other motion. */
  static get cycleSeconds(): number {
    return COMET_CYCLE_SECONDS;
  }

  applyQuality(settings: QualitySettings): void {
    this.enabled = settings.orbitComet;
    this.syncPose();
  }

  setLayoutScale(scale: number): void {
    if (Math.abs(scale - this.layoutScale) < 1e-4) return;
    this.layoutScale = scale;
    this.syncPose();
  }

  /**
   * Point the comet at an atom. A new target restarts the arc at that atom's
   * orbital angle; re-selecting the same atom keeps the current lap running.
   * @returns true when a new arc was born
   */
  setTarget(atomId: string | null, intensity: number): boolean {
    // The boot chain owns the arc until it hands back.
    if (this.bootArc) return false;
    this.intensity = Math.max(0, Math.min(1, intensity));
    if (this.activeAtomId === atomId) {
      this.syncPose();
      return false;
    }
    this.activeAtomId = atomId;
    this.age = 0;
    this.syncPose();
    return atomId !== null;
  }

  /**
   * Home boot: fly one arc along one orbit under the intro clock. `head` is a
   * ring-frame angle, so the caller can start on the far side of the ring and
   * land on the atom; `progress` is the lit arc behind the head (turns).
   * Pass `null` to hand control back to `setTarget`.
   */
  setBootArc(
    atomId: string | null,
    head: number,
    progress: number,
    opacity: number,
  ): void {
    if (atomId === null) {
      if (!this.bootArc) return;
      this.bootArc = null;
      this.age = 0;
      this.syncPose();
      return;
    }
    this.scratchBoot.head = head;
    this.scratchBoot.progress = progress;
    this.scratchBoot.opacity = opacity;
    this.bootArc = this.scratchBoot;
    if (this.activeAtomId !== atomId) {
      this.activeAtomId = atomId;
      this.age = 0;
      this.syncPose();
    }
  }

  update(delta: number, opacity: number, reducedMotion: boolean): void {
    if (!this.enabled) {
      this.line.visible = false;
      return;
    }

    const boot = this.bootArc;
    if (boot) {
      this.material.uniforms.uHead!.value = boot.head % TAU;
      this.material.uniforms.uProgress!.value = boot.progress;
      this.material.uniforms.uOpacity!.value = boot.opacity;
      this.line.visible = boot.opacity > 0.01;
      return;
    }

    this.age += delta;

    const grow = reducedMotion
      ? 1
      : Math.min(1, this.age / COMET_GROW_SECONDS);
    // Never start at 0: a visible stub at the atom from the first frame.
    this.material.uniforms.uProgress!.value = 0.12 + 0.88 * grow * grow;

    // Grow from the atom: the head leaves the birth point and laps the ring
    // once per cycle.
    const head = reducedMotion
      ? this.birthAngle
      : this.birthAngle + this.age * COMET_SPEED;
    this.material.uniforms.uHead!.value = head % TAU;

    // Visible immediately: a faint short arc at the atom on frame 0, fully
    // grown within COMET_GROW_SECONDS. The target change must read at once,
    // not after the molecule's commit turn settles.
    this.line.visible = this.intensity > 0.01;
    const strength = opacity * this.intensity;
    this.material.uniforms.uOpacity!.value = strength;  }

  dispose(): void {
    this.line.removeFromParent();
    this.material.dispose();
  }

  private syncPose(): void {
    const placement = this.activeAtomId
      ? ATOM_ORBIT_PLACEMENT[this.activeAtomId]
      : undefined;
    if (!placement || !this.enabled) {
      this.line.visible = false;
      this.intensity = 0;
      return;
    }
    this.line.position.set(0, 0, 0);
    orbitQuaternion(placement.orbit, this.scratchQ);
    this.line.quaternion.copy(this.scratchQ);
    this.line.scale.setScalar(
      placement.orbit.radius * this.layoutScale * 1.002,
    );
    // Born where the atom sits on its own ring.
    this.birthAngle = placement.theta;
    this.line.visible = (this.bootArc?.opacity ?? this.intensity) > 0.01;
  }
}
