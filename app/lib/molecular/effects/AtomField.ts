import {
  AdditiveBlending,
  LineBasicMaterial,
  LineSegments,
  Quaternion,
  Vector3,
} from 'three';
import type { Atom } from '../Atom';
import { CHROME_SOFT_COLOR, SHELL_ROUTE_COLOR } from '../sceneColors';
import type { GeometryCache } from '../resources/GeometryCache';
import type { QualitySettings } from '../quality/types';
import type { EffectsFrameState } from './types';

const SHELL_SCALE = 1.12;
/** Single drafting shell — one wrap, not a stack. */
const SHELL_HOME_OPACITY = 0.14;
const SHELL_FROZEN_OPACITY = 0.3;
/** Home-only continuous spin; a frozen route holds a fixed pose. */
const SHELL_SPEED = 0.12;
/** Normalized delay matching the listing stagger: 55ms of a 1.25s draw. */
const SHELL_REVEAL_DELAY = 0.045;
const SHELL_AXIS = new Vector3(0.22, 1, 0.12).normalize();

/**
 * The atom's drafting field: one 1px wire shell.
 *
 * Home spins and breathes it, and swells it on the atom-change pulse. A frozen
 * route pins one pose — the shell never turns, grows or fades with scroll, so
 * the peripheral atom reads as a still object. No glow, no surface lattice, no
 * blurred sweep, no postprocessing.
 */
export class AtomField {
  private readonly cache: GeometryCache;
  private readonly shell: LineSegments;
  private readonly shellMaterial: LineBasicMaterial;
  private readonly scratchQ = new Quaternion();
  private atom: Atom | null = null;

  constructor(cache: GeometryCache, settings: QualitySettings) {
    this.cache = cache;

    this.shellMaterial = new LineBasicMaterial({
      color: CHROME_SOFT_COLOR,
      transparent: true,
      opacity: 0,
      depthTest: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    this.shell = new LineSegments(
      cache.getUnitIcosahedronEdges(settings.atomDetail),
      this.shellMaterial,
    );
    this.shell.name = 'atom-field-shell';
    this.shell.raycast = () => {};
    this.shell.frustumCulled = false;
    this.shell.renderOrder = 2;
    this.shell.visible = false;
  }

  applyQuality(settings: QualitySettings): void {
    this.shell.geometry = this.cache.getUnitIcosahedronEdges(
      settings.atomDetail,
    );
    this.syncVisibility();
  }

  setAtom(atom: Atom | null): void {
    if (this.atom === atom) return;
    this.shell.removeFromParent();
    this.atom = atom;
    if (atom) {
      atom.object.add(this.shell);
    }
    this.syncVisibility();
  }

  /**
   * @param pulse home atom-change swell, 0..1 (always 0 off home)
   * @param reveal 0→1 entrance, same cadence as the hairline listing draw
   */
  update(
    elapsed: number,
    state: EffectsFrameState,
    fade: number,
    pulse: number,
    reveal: number,
  ): void {
    const atom = this.atom;
    if (!atom || fade <= 0.004) {
      this.shell.visible = false;
      return;
    }

    const radius = atom.radius;
    const reduced = state.reducedMotion;
    const shellReveal = reduced
      ? 1
      : Math.max(
          0,
          Math.min(
            1,
            (reveal - SHELL_REVEAL_DELAY) / (1 - SHELL_REVEAL_DELAY),
          ),
        );
    const draw = shellReveal * shellReveal * (3 - 2 * shellReveal);

    this.shell.visible = draw > 0.01;
    if (!this.shell.visible) return;

    if (!state.home) {
      // Frozen route: constant orientation, scale and opacity.
      this.shell.quaternion.identity();
      this.shell.scale.setScalar(radius * SHELL_SCALE);
      this.shellMaterial.color.setHex(SHELL_ROUTE_COLOR);
      this.shellMaterial.opacity = Math.min(
        0.55,
        fade * SHELL_FROZEN_OPACITY * draw,
      );
      return;
    }

    // Home: continuous spin, slow breathe, swell on the atom-change pulse.
    const spin = reduced ? 0 : elapsed * SHELL_SPEED;
    this.scratchQ.setFromAxisAngle(SHELL_AXIS, spin);
    this.shell.quaternion.copy(this.scratchQ);
    this.shell.scale.setScalar(radius * (SHELL_SCALE + pulse * 0.03));
    const breathe = reduced ? 1 : 0.82 + 0.18 * Math.sin(elapsed * 0.7);
    this.shellMaterial.color.setHex(CHROME_SOFT_COLOR);
    this.shellMaterial.opacity = Math.min(
      0.55,
      fade * SHELL_HOME_OPACITY * breathe * draw * (1 + pulse * 0.7),
    );
  }

  dispose(): void {
    this.shell.removeFromParent();
    this.shellMaterial.dispose();
  }

  private syncVisibility(): void {
    this.shell.visible = this.atom !== null;
  }
}
