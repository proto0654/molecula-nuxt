import type { SpatialRouteInput, SpatialState } from './types';

function normalizePath(path: string): string {
  if (!path || path === '/') return '/';
  const trimmed = path.replace(/\/+$/, '');
  return trimmed || '/';
}

/**
 * Pure route → spatial mapping. Components must not re-parse `route.path`
 * to decide molecule pose.
 */
export function spatialFromRoute(route: SpatialRouteInput): SpatialState {
  const segments = normalizePath(route.path).split('/').filter(Boolean);

  if (segments.length === 0) {
    return { mode: 'home' };
  }

  const [head, entityId] = segments;

  if (head === 'portfolio') {
    if (!entityId) {
      return { mode: 'portfolio-archive', context: 'portfolio' };
    }
    return { mode: 'case', context: 'portfolio', entityId };
  }

  if (head === 'services') {
    if (!entityId) {
      return { mode: 'service-archive', context: 'services' };
    }
    return { mode: 'service', context: 'services', entityId };
  }

  return { mode: 'section', sectionId: head };
}

export function spatialStateKey(state: SpatialState): string {
  return [
    state.mode,
    state.sectionId ?? '',
    state.context ?? '',
    state.entityId ?? '',
  ].join('|');
}
