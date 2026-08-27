export type HeroAutoplayTickContext = {
  isHome: boolean;
  busy: boolean;
  isFocusSettled: boolean;
  hasUserPreview: boolean;
  menuOpen: boolean;
  /** Currently committed nav item id (sync index after manual select). */
  committedItemId: string | null;
};

export type HeroAutoplayOptions = {
  items: readonly string[];
  slideDurationMs: number;
  idleResumeMs: number;
  onAdvance: (itemId: string) => void;
  onProgress: (ratio: number) => void;
};

/**
 * Cycles committed nav items on home after focus settles.
 * Progress fills during dwell; pauses on user interaction; resumes after idle.
 */
export class HeroAutoplay {
  private readonly items: readonly string[];
  private readonly slideDurationMs: number;
  private readonly idleResumeMs: number;
  private readonly onAdvance: (itemId: string) => void;
  private readonly onProgress: (ratio: number) => void;

  private running = false;
  private paused = false;
  private progress = 0;
  private index = 0;
  private idleElapsedMs = 0;
  private waitingForIdle = false;
  private dwelling = false;

  constructor(options: HeroAutoplayOptions) {
    this.items = options.items;
    this.slideDurationMs = Math.max(1, options.slideDurationMs);
    this.idleResumeMs = Math.max(0, options.idleResumeMs);
    this.onAdvance = options.onAdvance;
    this.onProgress = options.onProgress;
  }

  start(fromItemId?: string | null): void {
    this.running = true;
    this.paused = false;
    this.waitingForIdle = false;
    this.idleElapsedMs = 0;
    this.syncIndex(fromItemId);
    this.progress = 0;
    this.onProgress(0);
  }

  stop(): void {
    this.running = false;
    this.paused = false;
    this.waitingForIdle = false;
    this.idleElapsedMs = 0;
    this.progress = 0;
    this.onProgress(0);
  }

  /** Soft pause (hover / click / menu). Resume after idle when interactions clear. */
  pause(): void {
    if (!this.running) return;
    this.paused = true;
    this.waitingForIdle = true;
    this.idleElapsedMs = 0;
    this.dwelling = false;
  }

  /** Next item in autoplay order (wraps). */
  getNextItemId(): string | null {
    if (this.items.length === 0) return null;
    const nextIndex = (this.index + 1) % this.items.length;
    return this.items[nextIndex] ?? null;
  }

  /** True while progress is filling after focus settles (no user preview). */
  isDwelling(): boolean {
    return this.running && this.dwelling;
  }

  /** Force index + progress reset (e.g. restore home selection). */
  resetTo(itemId: string | null): void {
    this.syncIndex(itemId);
    this.progress = 0;
    this.onProgress(0);
    this.paused = false;
    this.waitingForIdle = false;
    this.idleElapsedMs = 0;
  }

  tick(dtMs: number, ctx: HeroAutoplayTickContext): void {
    if (!this.running) {
      this.dwelling = false;
      return;
    }

    if (!ctx.isHome || ctx.busy) {
      this.dwelling = false;
      if (this.progress !== 0) {
        this.progress = 0;
        this.onProgress(0);
      }
      return;
    }

    this.syncIndex(ctx.committedItemId);

    if (ctx.hasUserPreview || ctx.menuOpen) {
      this.paused = true;
      this.waitingForIdle = true;
      this.idleElapsedMs = 0;
      this.dwelling = false;
      return;
    }

    if (this.waitingForIdle) {
      this.dwelling = false;
      this.idleElapsedMs += dtMs;
      if (this.idleElapsedMs < this.idleResumeMs) return;
      this.waitingForIdle = false;
      this.paused = false;
      this.idleElapsedMs = 0;
    }

    if (this.paused) {
      this.dwelling = false;
      return;
    }

    if (!ctx.isFocusSettled) {
      this.dwelling = false;
      if (this.progress !== 0) {
        this.progress = 0;
        this.onProgress(0);
      }
      return;
    }

    this.dwelling = true;
    this.progress += dtMs / this.slideDurationMs;
    if (this.progress >= 1) {
      this.progress = 0;
      this.onProgress(0);
      this.advance();
      return;
    }
    this.onProgress(this.progress);
  }

  private advance(): void {
    if (this.items.length === 0) return;
    this.index = (this.index + 1) % this.items.length;
    this.onAdvance(this.items[this.index]!);
  }

  private syncIndex(itemId: string | null | undefined): void {
    if (!itemId || this.items.length === 0) return;
    const next = this.items.indexOf(itemId);
    if (next >= 0 && next !== this.index) {
      this.index = next;
      this.progress = 0;
      this.onProgress(0);
    }
  }
}
