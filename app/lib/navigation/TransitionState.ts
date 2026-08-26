/**
 * Centralized page-transition animation state.
 * Owned by `Navigator` — not by Three.js classes.
 */

export type TransitionPhase =
  | 'idle'
  | 'focus'
  | 'approach'
  | 'zoom'
  | 'fill'
  | 'overlay'
  | 'complete';

export type TransitionSnapshot = {
  phase: TransitionPhase;
  atomId: string | null;
  /** Overall timeline progress in [0, 1] (GSAP). */
  progress: number;
  zoom: number;
  fill: number;
  overlay: number;
  /** True while a forward or reverse timeline is active. */
  busy: boolean;
};

export type TransitionListener = (snapshot: TransitionSnapshot) => void;

export class TransitionState {
  phase: TransitionPhase = 'idle';
  atomId: string | null = null;
  progress = 0;
  zoom = 0;
  fill = 0;
  overlay = 0;
  busy = false;

  private readonly listeners = new Set<TransitionListener>();

  get snapshot(): TransitionSnapshot {
    return {
      phase: this.phase,
      atomId: this.atomId,
      progress: this.progress,
      zoom: this.zoom,
      fill: this.fill,
      overlay: this.overlay,
      busy: this.busy,
    };
  }

  patch(partial: Partial<TransitionSnapshot>): void {
    if (partial.phase !== undefined) this.phase = partial.phase;
    if (partial.atomId !== undefined) this.atomId = partial.atomId;
    if (partial.progress !== undefined) this.progress = partial.progress;
    if (partial.zoom !== undefined) this.zoom = partial.zoom;
    if (partial.fill !== undefined) this.fill = partial.fill;
    if (partial.overlay !== undefined) this.overlay = partial.overlay;
    if (partial.busy !== undefined) this.busy = partial.busy;
    this.emit();
  }

  resetVisuals(): void {
    this.patch({
      phase: 'idle',
      atomId: null,
      progress: 0,
      zoom: 0,
      fill: 0,
      overlay: 0,
      busy: false,
    });
  }

  subscribe(listener: TransitionListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snap = this.snapshot;
    for (const listener of this.listeners) {
      listener(snap);
    }
  }
}
