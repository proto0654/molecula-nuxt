/** WebGL clear / fog / CSS `--color-bg` — keep in sync with `main.css`. */
export const SCENE_BG = 0x14161c;

/** Brand accent — keep in sync with `--color-accent` in `main.css` / logo `#6EC99F`. */
export const ACCENT_COLOR = 0x6ec99f;

/** Lighter mint for entity light sweeps (accent mixed toward white). */
export const ACCENT_LIGHT_COLOR = 0xa8e0c4;

/**
 * Key directional — white with ~30% ACCENT_LIGHT_COLOR.
 * Lights facing facets (Lambert + residual Standard albedo); keeps shadows dark.
 */
export const KEY_LIGHT_COLOR = 0xe5f6ed;

/** Fill directional — cool gray leaned toward accent (weak opposing cast). */
export const FILL_LIGHT_COLOR = 0xb8d7cf;

/**
 * HIGH/MEDIUM shell emissive target — SCENE_BG mixed ~18% accent, then
 * scaled to the same relative luminance as SCENE_BG so facet relief stays.
 * (Raising brightness here flattens Standard shells.)
 */
export const SHELL_DIM_COLOR = 0x101817;

/** Settled off-home approach — wireframe / reticle dim (slightly above scene clear). */
export const CHROME_DIM_COLOR = 0x2a2e38;
