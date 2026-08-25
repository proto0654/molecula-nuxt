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

export const COMPOSITION_PROFILES: Record<ViewportMode, CompositionProfile> = {
  desktop: {
    mode: 'desktop',
    screenX: 0.62,
    screenY: 0.5,
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
    screenY: 0.44,
    approach: 0.28,
  },
};

export function resolveViewportMode(options: {
  desktop: boolean;
  tablet: boolean;
}): ViewportMode {
  if (options.desktop) return 'desktop';
  if (options.tablet) return 'tablet';
  return 'mobile';
}
