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
  /** Normalized document scroll progress on peripheral routes (0–1). */
  scrollProgress: number;
  /** Home boot: 0 hides the whole atmosphere, 1 = live. */
  introReveal: number;
  reducedMotion: boolean;
};
