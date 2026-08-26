export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

/**
 * Viewport-fraction framing for the molecule rest pose.
 * World atom locals stay unchanged; offsets are applied along camera axes.
 */
export type CompositionProfile = {
  mode: ViewportMode;
  /** Viewport X fraction (0.5 = center). */
  screenX: number;
  /** Viewport Y fraction (0.5 = center; smaller = higher on screen). */
  screenY: number;
  /** Pull toward camera along look (world units) for larger on-screen presence. */
  approach: number;
};

/**
 * Default rest framing is screen-centered on every viewport.
 * Hero desktop stage bias is a home-only override (`HOME_DESKTOP_FRAMING`).
 */
export const COMPOSITION_PROFILES: Record<ViewportMode, CompositionProfile> = {
  desktop: {
    mode: 'desktop',
    screenX: 0.5,
    // Camera lookAt is y=0.2; hub at origin reads low at screenY 0.5 — bias up slightly.
    screenY: 0.45,
    approach: 0,
  },
  tablet: {
    mode: 'tablet',
    screenX: 0.5,
    screenY: 0.47,
    approach: 0.12,
  },
  mobile: {
    mode: 'mobile',
    screenX: 0.5,
    // Slight downward bias from center.
    screenY: 0.56,
    approach: 0.28,
  },
};

/** Home desktop only: stage right of the nav rail (matches HUD mask ~62% X). */
export const HOME_DESKTOP_FRAMING = {
  screenX: 0.62,
  screenY: 0.45,
  approach: 0,
} as const;

/** Screen-center rest framing (leave-home approach / peripheral pullback). */
export const CENTER_FRAMING = {
  screenX: 0.5,
  screenY: 0.5,
  approach: 0,
} as const;

export function resolveViewportMode(options: {
  desktop: boolean;
  tablet: boolean;
}): ViewportMode {
  if (options.desktop) return 'desktop';
  if (options.tablet) return 'tablet';
  return 'mobile';
}
