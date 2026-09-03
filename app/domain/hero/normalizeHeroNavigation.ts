import type { HeroNavItemRow } from '~/types/wp';
import type { NavigationItem } from '~/lib/navigation/navigationConfig';
import { NAV_STRUCTURE } from '~/lib/navigation/navStructure';

function rowForNavId(
  rows: readonly HeroNavItemRow[],
  navId: string,
): HeroNavItemRow | undefined {
  return rows.find((row) => row.navId === navId);
}

function pick(wp: string | null | undefined): string {
  return wp?.trim() || '';
}

/** Merge fixed nav structure with page hero copy (WP only — no string fallbacks). */
export function mergeHeroNavigation(
  rows: readonly HeroNavItemRow[],
): NavigationItem[] {
  return NAV_STRUCTURE.map((struct) => {
    const row = rowForNavId(rows, struct.id);
    const blurbCta = pick(row?.blurbCta);
    return {
      id: struct.id,
      atomId: struct.atomId,
      route: struct.route,
      label: pick(row?.label),
      blurb: pick(row?.blurb),
      blurbCta: blurbCta || undefined,
      usp: pick(row?.usp),
    };
  });
}
