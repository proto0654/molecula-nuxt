import { scrambleText, type ScrambleHandle } from './textScramble';

/**
 * HUD USP headline: armed on commit, revealed after focus settle via scramble.
 * Pointer-events none. Visibility driven by CSS `.is-visible` + zoom fade.
 */
export class UspHeadline {
  readonly root: HTMLElement;
  private readonly textEl: HTMLElement;
  private pending: string | null = null;
  private revealed: string | null = null;
  private handle: ScrambleHandle | null = null;
  private zoomFade = 0;
  private readonly reducedMotion: boolean;

  constructor(parent: HTMLElement) {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.root = document.createElement('div');
    this.root.className = 'usp-headline';
    this.root.setAttribute('aria-live', 'polite');
    this.root.setAttribute('aria-atomic', 'true');

    this.textEl = document.createElement('p');
    this.textEl.className = 'usp-headline__text';

    this.root.append(this.textEl);
    parent.append(this.root);
    this.setZoomFade(0);
  }

  /**
   * Queue USP for later reveal. Does not scramble until `tryReveal()`.
   * Pass `null` to clear.
   */
  arm(text: string | null): void {
    this.cancelScramble();
    this.pending = text;
    this.revealed = null;

    if (!text) {
      this.textEl.textContent = '';
      this.root.classList.remove('is-visible', 'is-scrambling');
      return;
    }

    // Hide previous line while the new atom settles.
    this.root.classList.remove('is-visible', 'is-scrambling');
    this.textEl.textContent = '';
  }

  /** Start scramble if armed and not already showing that string. */
  tryReveal(): void {
    if (!this.pending || this.revealed === this.pending) return;
    const target = this.pending.toLocaleUpperCase('ru-RU');
    this.revealed = this.pending;
    this.cancelScramble();
    this.root.classList.add('is-visible', 'is-scrambling');

    this.handle = scrambleText(target, {
      duration: 1.05,
      reducedMotion: this.reducedMotion,
      onFrame: (display) => {
        this.textEl.textContent = display;
      },
      onComplete: () => {
        this.root.classList.remove('is-scrambling');
        this.handle = null;
      },
    });
  }

  hide(): void {
    this.arm(null);
  }

  /** 0 = full opacity, 1 = fully faded (during zoom/fill). */
  setZoomFade(fade: number): void {
    this.zoomFade = Math.min(1, Math.max(0, fade));
    this.root.style.setProperty('--usp-zoom-fade', String(this.zoomFade));
  }

  dispose(): void {
    this.cancelScramble();
    this.root.remove();
  }

  private cancelScramble(): void {
    this.handle?.cancel();
    this.handle = null;
  }
}
