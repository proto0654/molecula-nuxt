export type HeroSlideProgressVariant = 'desktop' | 'mobile';

/**
 * Thin progress track for hero slide autoplay.
 * Desktop: centered in header. Mobile: above bottom nav.
 */
export class HeroSlideProgress {
  readonly root: HTMLElement;
  private readonly fillEl: HTMLElement;

  constructor(parent: HTMLElement, variant: HeroSlideProgressVariant) {
    this.root = document.createElement('div');
    this.root.className = `hero-slide-progress hero-slide-progress--${variant}`;
    this.root.setAttribute('aria-hidden', 'true');

    const track = document.createElement('div');
    track.className = 'hero-slide-progress__track';

    this.fillEl = document.createElement('div');
    this.fillEl.className = 'hero-slide-progress__fill';
    this.fillEl.style.transform = 'scaleX(0)';

    track.append(this.fillEl);
    this.root.append(track);
    parent.append(this.root);
  }

  setProgress(ratio: number): void {
    const t = Math.max(0, Math.min(1, ratio));
    this.fillEl.style.transform = `scaleX(${t})`;
  }

  reset(): void {
    this.setProgress(0);
  }

  dispose(): void {
    this.root.remove();
  }
}
