import { getItemById } from '../navigation/navigationConfig';
import type { SpatialContext, SpatialState } from './types';

/** Nav item id that owns a spatial context (not a URL). */
export const CONTEXT_ITEM_ID: Record<SpatialContext, string> = {
  portfolio: 'work',
  services: 'services',
};

export const HOME_ITEM_ID = 'home';

export function atomIdForSection(sectionId: string): string | null {
  const fromNav = getItemById(sectionId)?.atomId ?? null;
  if (fromNav) return fromNav;
  // Legal page: frame hub at approach (not a nav-rail destination).
  if (sectionId === 'privacy-policy') return hubAtomId();
  return null;
}

export function atomIdForContext(context: SpatialContext): string | null {
  return getItemById(CONTEXT_ITEM_ID[context])?.atomId ?? null;
}

/** Framed atom for a spatial state (hub on home; null if unmapped). */
export function atomIdForSpatialState(state: SpatialState): string | null {
  switch (state.mode) {
    case 'home':
      return hubAtomId();
    case 'section':
      return state.sectionId ? atomIdForSection(state.sectionId) : null;
    case 'portfolio-archive':
    case 'case':
      return atomIdForContext('portfolio');
    case 'service-archive':
    case 'service':
      return atomIdForContext('services');
    default:
      return null;
  }
}

export function itemIdForContext(context: SpatialContext): string {
  return CONTEXT_ITEM_ID[context];
}

export function hubAtomId(): string {
  return getItemById(HOME_ITEM_ID)?.atomId ?? 'C';
}
