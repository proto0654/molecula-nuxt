export type HeroAutoplayTickContext = {
  isHome: boolean;
  busy: boolean;
  isFocusSettled: boolean;
  hasUserPreview: boolean;
  /**
   * Hover preview on an atom that is not the committed one. Hovering the
   * committed atom pauses the clock but must not take the next-atom hint away:
   * right after a click the pointer sits on the atom that was just committed.
   */
  hasDistinctPreview: boolean;
  menuOpen: boolean;
  /** Currently committed nav item id (sync index after manual select). */
  committedItemId: string | null;
  /**
   * Per-frame turn progress toward the committed atom (0 → 1). The next
   * atom is highlighted as soon as the turn starts, so the effects are lit
   * while the molecule is still rotating, not after it settles.
   */
  turnProgress?: number;
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
 * The next atom is highlighted as soon as the commit turn starts.
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
  /**
   * The committed item just changed: highlight the next atom immediately and
   * let the slide clock advance through the turn instead of freezing on it.
   */
  private awaitingTurn = false;
  /**
   * Manual selection pauses the slide clock for the idle hold, but the next
   * atom must stay hinted for that whole hold: otherwise the orbit comet,
   * dust stream and pulsing wireframe sit on the clicked atom and only move
   * once the idle resume starts the dwell.
   */
  private hintWhilePaused = false;
  /** Smaller than the settled value, so the progress bar keeps moving. */
  private static readonly TURN_SETTLE_GATE = 0.35;

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
    this.hintWhilePaused = false;
    this.idleElapsedMs = 0;
    this.syncIndex(fromItemId, false);
    this.progress = 0;
    this.onProgress(0);
  }

  stop(): void {
    this.running = false;
    this.paused = false;
    this.waitingForIdle = false;
    this.hintWhilePaused = false;
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

  /**
   * Manual atom selection (click / HUD / connector): pause the slide clock for
   * the idle hold, yet hint the next atom from this frame on. The commit turn
   * and the effects then move together, exactly like an autoplay advance.
   */
  selectCommitted(itemId: string): void {
    this.pause();
    if (!this.items.includes(itemId)) return;
    this.hintWhilePaused = true;
    this.syncIndex(itemId);
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

  /**
   * True once the next atom may be hinted: from the first frame of the commit
   * turn, so the orbit / dust / pulsing wireframe light up while the molecule
   * is still rotating toward the viewer. A manual commit keeps the hint
   * through the idle pause that follows it.
   */
  isNextHinted(): boolean {
    if (!this.running) return false;
    if (this.hintWhilePaused) return true;
    return (this.dwelling || this.awaitingTurn) && !this.paused;
  }

  /** Force index + progress reset (e.g. restore home selection). */
  resetTo(itemId: string | null): void {
    this.syncIndex(itemId, false);
    this.progress = 0;
    this.onProgress(0);
    this.paused = false;
    this.waitingForIdle = false;
    this.hintWhilePaused = false;
    this.idleElapsedMs = 0;
  }

  tick(dtMs: number, ctx: HeroAutoplayTickContext): void {
    if (!this.running) {
      this.dwelling = false;
      return;
    }

    if (!ctx.isHome || ctx.busy) {
      this.hintWhilePaused = false;
      this.dwelling = false;
      if (this.progress !== 0) {
        this.progress = 0;
        this.onProgress(0);
      }
      return;
    }

    this.syncIndex(ctx.committedItemId);

    if (ctx.hasUserPreview || ctx.menuOpen) {
      // Only a preview of another atom (or the menu) owns the effects. A
      // pointer resting on the just-committed atom keeps the manual hint.
      if (ctx.hasDistinctPreview || ctx.menuOpen) this.hintWhilePaused = false;
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
      // Dwell takes over the hint from here on.
      this.hintWhilePaused = false;
      this.idleElapsedMs = 0;
    }

    if (this.paused) {
      this.dwelling = false;
      return;
    }

    if (!ctx.isFocusSettled) {
      // Keep the clock running through the turn once a new atom was committed:
      // the next atom is already lit while the molecule is still rotating.
      const turning =
        this.awaitingTurn &&
        !ctx.hasUserPreview &&
        (ctx.turnProgress ?? 0) >= HeroAutoplay.TURN_SETTLE_GATE;
      if (!turning) {
        this.dwelling = false;
        if (this.progress !== 0) {
          this.progress = 0;
          this.onProgress(0);
        }
        return;
      }
    } else if (this.awaitingTurn) {
      this.awaitingTurn = false;
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
    // Arm before notifying: the commit frame must already resolve the next
    // atom, otherwise the orbit / dust only switch on the following tick.
    this.awaitingTurn = true;
    this.onAdvance(this.items[this.index]!);
  }

  private syncIndex(
    itemId: string | null | undefined,
    armTurn = true,
  ): void {
    if (!itemId || this.items.length === 0) return;
    const next = this.items.indexOf(itemId);
    if (next >= 0 && next !== this.index) {
      this.index = next;
      this.progress = 0;
      this.onProgress(0);
      // A new commit starts the turn right now: light the next atom on the
      // same frame, before the dwell clock even begins.
      if (armTurn) this.awaitingTurn = true;
    }
  }
}
