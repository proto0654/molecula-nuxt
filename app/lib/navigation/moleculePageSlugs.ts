import type { NavStructureId } from './navStructure';

/**
 * WP page slugs for molecule nav nodes (label + hero_* ACF).
 * `home` uses the published front-page slug (`home-2` on production).
 */
export const MOLECULE_PAGE_SLUG_BY_NAV_ID: Record<NavStructureId, string> = {
  home: 'home-2',
  about: 'about',
  services: 'services',
  work: 'portfolio',
  contact: 'contact',
};

export const MOLECULE_PAGE_SLUGS = Object.values(MOLECULE_PAGE_SLUG_BY_NAV_ID);

export function navIdForMoleculeSlug(slug: string): NavStructureId | null {
  const entry = (
    Object.entries(MOLECULE_PAGE_SLUG_BY_NAV_ID) as [NavStructureId, string][]
  ).find(([, pageSlug]) => pageSlug === slug);
  return entry?.[0] ?? null;
}
