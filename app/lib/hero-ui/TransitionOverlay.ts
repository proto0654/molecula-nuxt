/**
 * Full-viewport page-transition veil.
 * Driven only by opacity / visibility from `Navigator` — no router knowledge.
 */
export class TransitionOverlay {
  readonly root: HTMLElement;
  private opacity = 0;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'transition-overlay';
    this.root.setAttribute('aria-hidden', 'true');
    this.root.style.opacity = '0';
    this.root.style.pointerEvents = 'none';
    parent.append(this.root);
  }

  getOpacity(): number {
    return this.opacity;
  }

  setOpacity(value: number): void {
    const next = Math.max(0, Math.min(1, value));
    this.opacity = next;
    this.root.style.opacity = String(next);
    // Block interaction only once the veil is meaningfully present.
    this.root.style.pointerEvents = next > 0.05 ? 'auto' : 'none';
  }

  dispose(): void {
    this.root.remove();
  }
}
