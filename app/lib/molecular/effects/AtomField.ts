import {
  AdditiveBlending,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Quaternion,
  Vector3,
  type Scene,
} from 'three';
import type { Atom } from '../Atom';
import {
  ACCENT_COLOR,
  CHROME_SOFT_COLOR,
  SHELL_ROUTE_COLOR,
} from '../sceneColors';
import type { GeometryCache } from '../resources/GeometryCache';
import type { QualitySettings } from '../quality/types';
import type { EffectsFrameState } from './types';

const SHELL_SCALE = 1.12;
/** Single drafting shell — one wrap, not a stack. */
const SHELL_HOME_OPACITY = 0.14;
const SHELL_FROZEN_OPACITY = 0.3;
/** Home-only continuous spin; frozen routes rotate with scroll only. */
const SHELL_SPEED = 0.12;
/** Normalized delay matching the listing stagger: 55ms of a 1.25s draw. */
const SHELL_REVEAL_DELAY = 0.045;
const SCAN_OPACITY = 0.65;
const SHELL_AXIS = new Vector3(0.22, 1, 0.12).normalize();

/**
 * The atom's drafting field: one rotating 1px wire shell and a scroll-driven
 * horizon ring. No glow, no surface lattice, no blurred sweep, no
 * postprocessing; scroll only moves transforms.
 */
export class AtomField {
  private readonly cache: GeometryCache;
  private readonly shell: LineSegments;
  private readonly shellMaterial: LineBasicMaterial;
  private readonly scan: LineLoop;
  private readonly scanMaterial: LineBasicMaterial;
  private readonly scratchCenter = new Vector3();
  private readonly scratchQ = new Quaternion();
  private atom: Atom | null = null;
  private scanEnabled = false;
  private routeShellSpin = true;

  constructor(
    scene: Scene,
    cache: GeometryCache,
    settings: QualitySettings,
  ) {
    this.cache = cache;
    this.scanEnabled = settings.scanBand;
    this.routeShellSpin = settings.routeShellSpin;

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

    this.scanMaterial = new LineBasicMaterial({
      color: ACCENT_COLOR,
      transparent: true,
      opacity: 0,
      depthTest: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    this.scan = new LineLoop(cache.getUnitCircle(), this.scanMaterial);
    this.scan.name = 'atom-field-scan';
    this.scan.rotation.x = Math.PI / 2;
    this.scan.raycast = () => {};
    this.scan.frustumCulled = false;
    this.scan.renderOrder = 2;
    this.scan.visible = false;
    scene.add(this.scan);
  }

  applyQuality(settings: QualitySettings): void {
    this.scanEnabled = settings.scanBand;
    this.routeShellSpin = settings.routeShellSpin;
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
   * @param reveal 0→1 entrance, same cadence as the hairline listing draw.
   */
  update(
    elapsed: number,
    state: EffectsFrameState,
    fade: number,
    scroll: number,
    pulse: number,
    reveal: number,
  ): void {
    const atom = this.atom;
    if (!atom || fade <= 0.004) {
      this.hide();
      return;
    }

    const radius = atom.radius;
    const home = state.home;
    const settledFreeze = state.frozen && !state.approachBusy;
    const reduced = state.reducedMotion;
    const revealEase = reduced ? 1 : reveal * reveal * (3 - 2 * reveal);
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
    if (this.shell.visible) {
      // Home spins continuously; a frozen route only turns with scroll.
      const spin = reduced
        ? 0
        : home
          ? elapsed * SHELL_SPEED
          : this.routeShellSpin
            ? scroll * 1.6
            : 0;
      this.scratchQ.setFromAxisAngle(SHELL_AXIS, spin);
      this.shell.quaternion.copy(this.scratchQ);
      this.shell.scale.setScalar(
        radius * (SHELL_SCALE + scroll * 0.035 + pulse * 0.03),
      );
      const base = home ? SHELL_HOME_OPACITY : SHELL_FROZEN_OPACITY;
      // Frozen route: static opacity, no continuous breathing.
      const breathe = reduced || !home
        ? 1
        : 0.82 + 0.18 * Math.sin(elapsed * 0.7);
      this.shellMaterial.opacity = Math.min(
        0.55,
        fade * base * breathe * draw * (1 + scroll * 0.35 + pulse * 0.7),
      );
      this.shellMaterial.color.setHex(
        home ? CHROME_SOFT_COLOR : SHELL_ROUTE_COLOR,
      );
    }

    const showScan = settledFreeze && this.scanEnabled && fade > 0.01;
    this.scan.visible = showScan;
    if (showScan) {
      atom.object.getWorldPosition(this.scratchCenter);
      // Start near the equator: a centre-approach planet fills the viewport,
      // so a pole-to-pole ring would begin off-screen.
      const t = reduced ? 0.18 : 0.12 + scroll * 0.56;
      const ringRadius =
        radius * 1.003 * Math.sqrt(Math.max(0.06, 1 - t * t));
      this.scan.position.copy(this.scratchCenter);
      this.scan.position.y += t * radius * 0.92;
      this.scan.scale.set(ringRadius, ringRadius, 1);
      const breathe = reduced
        ? 1
        : 0.7 + 0.3 * Math.sin(elapsed * 1.1 + scroll * 4);
      this.scanMaterial.opacity =
        fade * SCAN_OPACITY * revealEase * breathe;
    }
  }

  dispose(): void {
    this.shell.removeFromParent();
    this.scan.removeFromParent();
    this.shellMaterial.dispose();
    this.scanMaterial.dispose();
  }

  private syncVisibility(): void {
    const visible = this.atom !== null;
    this.shell.visible = visible;
    this.hideOverlays();
  }

  private hide(): void {
    this.shell.visible = false;
    this.hideOverlays();
  }

  private hideOverlays(): void {
    this.scan.visible = false;
  }
}
