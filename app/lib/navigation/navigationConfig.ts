import { NAV_STRUCTURE } from './navStructure';

export type NavigationItem = {
  id: string;
  /** Nav rail + 3D atom caption — from WP page `post_title`. */
  label: string;
  atomId: string;
  route?: string;
  /** Typewriter part 1 — from WP `hero_blurb`. */
  blurb: string;
  /** CTA tail after click/tap verb — from WP `hero_blurb_cta`. */
  blurbCta?: string;
  /** HUD USP after focus — from WP `hero_usp`. */
  usp: string;
};

export type NavigationConfig = {
  items: NavigationItem[];
};

/** Structure only — copy comes from WP pages via useMoleculeHeroNav. */
export const navigationConfig: NavigationConfig = {
  items: NAV_STRUCTURE.map((struct) => ({
    id: struct.id,
    atomId: struct.atomId,
    route: struct.route,
    label: '',
    blurb: '',
    usp: '',
  })),
};

const itemsById = new Map(
  navigationConfig.items.map((item) => [item.id, item]),
);

const itemsByAtomId = new Map(
  navigationConfig.items.map((item) => [item.atomId, item]),
);

export function getItemById(id: string): NavigationItem | undefined {
  return itemsById.get(id);
}

export function getItemByAtomId(atomId: string): NavigationItem | undefined {
  return itemsByAtomId.get(atomId);
}

/** Replace nav copy in-place (structure id/atomId/route must stay stable). */
export function applyNavigationItems(items: readonly NavigationItem[]): void {
  navigationConfig.items.length = 0;
  navigationConfig.items.push(...items);
  itemsById.clear();
  itemsByAtomId.clear();
  for (const item of navigationConfig.items) {
    itemsById.set(item.id, item);
    itemsByAtomId.set(item.atomId, item);
  }
}
