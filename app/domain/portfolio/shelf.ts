import type { PortfolioSlimItem } from '~/api/portfolio';
import type { PortfolioCategory } from '~/types/wp';
import type { ArchiveReturnScope } from '~/lib/navigation/archiveReturn';
import {
  getCasePosition,
  sortPortfolioSlimIndex,
  type CasePosition,
} from '~/domain/portfolio/adjacent';

export const LEGACY_CATEGORY_SLUG = 'legacy';

export type PortfolioShelf = 'current' | 'legacy';
/** Resolve WP term id for `legacy` portfolio_category (null if missing). */
export function resolveLegacyCategoryId(
  categories: Array<Pick<PortfolioCategory, 'id' | 'slug'>> | null | undefined,
): number | null {
  for (const cat of categories ?? []) {
    if (cat.slug === LEGACY_CATEGORY_SLUG) return cat.id;
  }
  return null;
}

export function isLegacyCategoryIds(
  categoryIds: number[] | null | undefined,
  legacyCategoryId: number | null,
): boolean {
  if (legacyCategoryId == null) return false;
  return (categoryIds ?? []).includes(legacyCategoryId);
}

export function isLegacySlimItem(
  item: PortfolioSlimItem,
  legacyCategoryId: number | null,
): boolean {
  return isLegacyCategoryIds(item.categoryIds, legacyCategoryId);
}

export function filterSlimByShelf(
  slim: PortfolioSlimItem[],
  shelf: PortfolioShelf,
  legacyCategoryId: number | null,
): PortfolioSlimItem[] {
  if (legacyCategoryId == null) {
    return shelf === 'legacy' ? [] : [...slim];
  }
  return slim.filter((item) => {
    const legacy = isLegacySlimItem(item, legacyCategoryId);
    return shelf === 'legacy' ? legacy : !legacy;
  });
}

export function shelfForCategoryIds(
  categoryIds: number[] | null | undefined,
  legacyCategoryId: number | null,
): PortfolioShelf {
  return isLegacyCategoryIds(categoryIds, legacyCategoryId) ? 'legacy' : 'current';
}

export function archiveScopeForShelf(shelf: PortfolioShelf): ArchiveReturnScope {
  return shelf === 'legacy' ? 'portfolio-legacy' : 'portfolio';
}

export function shelfCounts(
  slim: PortfolioSlimItem[],
  legacyCategoryId: number | null,
): { current: number; legacy: number } {
  const current = filterSlimByShelf(slim, 'current', legacyCategoryId).length;
  const legacy = filterSlimByShelf(slim, 'legacy', legacyCategoryId).length;
  return { current, legacy };
}

/** Heading / link label with WP-style count: `Избранные кейсы (23)`. */
export function withCountLabel(label: string, count: number): string {
  return `${label} (${count})`;
}

/** Shelf for a slug from slim index (preferred for case→case nav). */
export function resolveCaseShelfFromSlim(
  slug: string,
  slim: PortfolioSlimItem[],
  legacyCategoryId: number | null,
  fallback: PortfolioShelf = 'current',
): PortfolioShelf {
  const item = slim.find((entry) => entry.slug === slug);
  if (!item) return fallback;
  return shelfForCategoryIds(item.categoryIds, legacyCategoryId);
}

/** Prev/next + CASE / NN within the case's shelf only. */
export function getCasePositionInShelf(
  slug: string,
  slim: PortfolioSlimItem[],
  legacyCategoryId: number | null,
  fallbackShelf: PortfolioShelf = 'current',
): CasePosition {
  const sorted = sortPortfolioSlimIndex(slim);
  const shelf = resolveCaseShelfFromSlim(
    slug,
    sorted,
    legacyCategoryId,
    fallbackShelf,
  );
  const shelfSlim = filterSlimByShelf(sorted, shelf, legacyCategoryId);
  return getCasePosition(slug, shelfSlim);
}

export function getCasePositionForSlug(
  fromSlug: string,
  slim: PortfolioSlimItem[],
  legacyCategoryId: number | null,
): CasePosition {
  return getCasePositionInShelf(fromSlug, slim, legacyCategoryId);
}
