import type { HeroNavItemRow } from '~/types/wp';
import type { NavigationItem } from '~/lib/navigation/navigationConfig';
import { NAV_STRUCTURE } from '~/lib/navigation/navStructure';

function rowForNavId(
  rows: readonly HeroNavItemRow[],
  navId: string,
): HeroNavItemRow | undefined {
  return rows.find((row) => row.navId === navId);
}

function pickCopy(
  wp: string | null | undefined,
  fallback: string | undefined,
): string {
  const trimmed = wp?.trim();
  if (trimmed) return trimmed;
  return fallback ?? '';
}

/** Merge fixed nav structure with WP options copy; fall back to in-code defaults. */
export function mergeHeroNavigation(
  rows: readonly HeroNavItemRow[],
  defaults: readonly NavigationItem[],
): NavigationItem[] {
  return NAV_STRUCTURE.map((struct) => {
    const row = rowForNavId(rows, struct.id);
    const base = defaults.find((item) => item.id === struct.id);
    return {
      id: struct.id,
      atomId: struct.atomId,
      route: struct.route,
      label: pickCopy(row?.label, base?.label),
      blurb: pickCopy(row?.blurb, base?.blurb),
      blurbCta: row?.blurbCta?.trim() || base?.blurbCta,
      usp: pickCopy(row?.usp, base?.usp),
    };
  });
}
