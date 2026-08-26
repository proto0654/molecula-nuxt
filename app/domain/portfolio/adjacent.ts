import type { PortfolioSlimItem } from '~/api/portfolio';

export type AdjacentCases = {
  prev: PortfolioSlimItem | null;
  next: PortfolioSlimItem | null;
};

/**
 * Production order: menu_order ASC, then date DESC among ties.
 * Do not use archive-page array index.
 */
export function sortPortfolioSlimIndex(items: PortfolioSlimItem[]): PortfolioSlimItem[] {
  return [...items].sort((a, b) => {
    if (a.menu_order !== b.menu_order) return a.menu_order - b.menu_order;
    // date DESC
    return b.date.localeCompare(a.date);
  });
}

export type CasePosition = AdjacentCases & {
  /** 1-based index in production order; null if slug is missing from the index. */
  index: number | null;
  total: number;
};

export function getAdjacentCases(
  slug: string,
  slimIndex: PortfolioSlimItem[],
): AdjacentCases {
  const { prev, next } = getCasePosition(slug, slimIndex);
  return { prev, next };
}

export function getCasePosition(
  slug: string,
  slimIndex: PortfolioSlimItem[],
): CasePosition {
  const sorted = sortPortfolioSlimIndex(slimIndex);
  const index = sorted.findIndex((item) => item.slug === slug);
  if (index < 0) {
    return { prev: null, next: null, index: null, total: sorted.length };
  }
  return {
    prev: index > 0 ? sorted[index - 1]! : null,
    next: index < sorted.length - 1 ? sorted[index + 1]! : null,
    index: index + 1,
    total: sorted.length,
  };
}
