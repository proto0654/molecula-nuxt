/**
 * Per-frame state for the atmosphere layer.
 * Owned by `MoleculeController`; effects never read routes or DOM.
 */
export type EffectsFrameState = {
  /** Home is the only mode where the molecule is unfrozen. */
  home: boolean;
  frozen: boolean;
  /** Navigator owns the approach timeline — effects fade out while it runs. */
  approachBusy: boolean;
  /** Committed atom on home, focused atom on peripheral routes. */
  focusedAtomId: string | null;
  focusStrength: number;
  zoomProgress: number;
  fillProgress: number;
  /** Home boot: atmosphere gate (drafting field + rims); 0 hides, 1 = live. */
  introReveal: number;
  /** Home boot: ambient dust spawn from the hub (0 = still at the hub, 1 = live). */
  introDust: number;
  reducedMotion: boolean;
  /**
   * Autoplay is held by user interaction: the upcoming-atom scenario clocks
   * (orbit comet, dust stream) freeze so the progress bar and the effects
   * never drift apart. Ambient shell drift is not affected.
   */
  scenarioHeld: boolean;
};
