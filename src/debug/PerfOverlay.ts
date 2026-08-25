import type { QualityManager } from '../3d/quality/QualityManager';

/** Flip to `false` to hide the overlay in dev without a query param. */
export const DEBUG_PERF = true;

const UPDATE_MS = 250;
/** Match `MOBILE_MQ` in main.ts / `--bp-mobile-max`. */
const MOBILE_MQ = '(max-width: 767px)';

function isOverlayEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  if (!DEBUG_PERF) return false;
  const debug = new URLSearchParams(window.location.search).get('debug');
  if (debug === '0' || debug === 'false') return false;
  return true;
}

/**
 * Dev-only HUD: FPS, frame time, quality, pixel ratio.
 * Visible only on non-mobile viewports at HIGH quality.
 * DOM writes are throttled — do not call `flush` from every rAF yourself.
 */
export class PerfOverlay {
  private readonly root: HTMLPreElement;
  private readonly unsubscribeQuality: () => void;
  private readonly quality: QualityManager;
  private readonly getPixelRatio: () => number;
  private readonly mobileMq: MediaQueryList;
  private readonly onMobileChange: () => void;
  private fps = 0;
  private frameMs = 0;
  private lastDom = 0;
  private visible = false;

  static tryCreate(
    parent: HTMLElement,
    quality: QualityManager,
    getPixelRatio: () => number,
  ): PerfOverlay | null {
    if (!isOverlayEnabled()) return null;
    return new PerfOverlay(parent, quality, getPixelRatio);
  }

  private constructor(
    parent: HTMLElement,
    quality: QualityManager,
    getPixelRatio: () => number,
  ) {
    this.quality = quality;
    this.getPixelRatio = getPixelRatio;
    this.root = document.createElement('pre');
    this.root.className = 'perf-overlay';
    this.root.setAttribute('aria-hidden', 'true');
    this.root.hidden = true;
    parent.append(this.root);

    this.mobileMq = window.matchMedia(MOBILE_MQ);
    this.onMobileChange = () => {
      this.syncVisibility();
    };
    this.mobileMq.addEventListener('change', this.onMobileChange);

    this.unsubscribeQuality = quality.subscribe(() => {
      this.syncVisibility();
      if (this.visible) this.flush();
    });
    this.syncVisibility();
    if (this.visible) this.flush();
  }

  record(deltaSeconds: number): void {
    if (!this.visible) return;

    this.frameMs = deltaSeconds * 1000;
    const instant = deltaSeconds > 1e-6 ? 1 / deltaSeconds : 0;
    this.fps += (instant - this.fps) * 0.2;

    const now = performance.now();
    if (now - this.lastDom < UPDATE_MS) return;
    this.lastDom = now;
    this.flush();
  }

  dispose(): void {
    this.mobileMq.removeEventListener('change', this.onMobileChange);
    this.unsubscribeQuality();
    this.root.remove();
  }

  private syncVisibility(): void {
    const show =
      !this.mobileMq.matches && this.quality.get().level === 'high';
    this.visible = show;
    this.root.hidden = !show;
  }

  private flush(): void {
    const settings = this.quality.get();
    this.root.textContent =
      `FPS  ${this.fps.toFixed(0)}\n` +
      `FT   ${this.frameMs.toFixed(1)}ms\n` +
      `QUAL ${settings.level}\n` +
      `DPR  ${this.getPixelRatio().toFixed(2)}`;
  }
}
