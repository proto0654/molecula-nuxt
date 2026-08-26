import { getItemById } from '../navigation/navigationConfig';
import type { SpatialContext } from './types';

/** Nav item id that owns a spatial context (not a URL). */
export const CONTEXT_ITEM_ID: Record<SpatialContext, string> = {
  portfolio: 'work',
  services: 'services',
};

export const HOME_ITEM_ID = 'home';

export function atomIdForSection(sectionId: string): string | null {
  return getItemById(sectionId)?.atomId ?? null;
}

export function atomIdForContext(context: SpatialContext): string | null {
  return getItemById(CONTEXT_ITEM_ID[context])?.atomId ?? null;
}

export function itemIdForContext(context: SpatialContext): string {
  return CONTEXT_ITEM_ID[context];
}

export function hubAtomId(): string {
  return getItemById(HOME_ITEM_ID)?.atomId ?? 'C';
}
