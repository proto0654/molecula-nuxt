import type { QualityManager } from '../3d/quality/QualityManager';

/** Flip to `false` to hide the overlay in dev without a query param. */
export const DEBUG_PERF = true;

const UPDATE_MS = 250;

function isOverlayEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  if (!DEBUG_PERF) return false;
  const debug = new URLSearchParams(window.location.search).get('debug');
  if (debug === '0' || debug === 'false') return false;
  return true;
}

/**
 * Dev-only HUD: FPS, frame time, quality, pixel ratio.
 * DOM writes are throttled — do not call `flush` from every rAF yourself.
 */
export class PerfOverlay {
  private readonly root: HTMLPreElement;
  private readonly unsubscribeQuality: () => void;
  private readonly quality: QualityManager;
  private readonly getPixelRatio: () => number;
  private fps = 0;
  private frameMs = 0;
  private lastDom = 0;

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
    parent.append(this.root);

    this.unsubscribeQuality = quality.subscribe(() => {
      this.flush();
    });
    this.flush();
  }

  record(deltaSeconds: number): void {
    this.frameMs = deltaSeconds * 1000;
    const instant = deltaSeconds > 1e-6 ? 1 / deltaSeconds : 0;
    this.fps += (instant - this.fps) * 0.2;

    const now = performance.now();
    if (now - this.lastDom < UPDATE_MS) return;
    this.lastDom = now;
    this.flush();
  }

  dispose(): void {
    this.unsubscribeQuality();
    this.root.remove();
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
