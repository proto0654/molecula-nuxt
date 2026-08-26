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

export function getAdjacentCases(
  slug: string,
  slimIndex: PortfolioSlimItem[],
): AdjacentCases {
  const sorted = sortPortfolioSlimIndex(slimIndex);
  const index = sorted.findIndex((item) => item.slug === slug);
  if (index < 0) {
    return { prev: null, next: null };
  }
  return {
    prev: index > 0 ? sorted[index - 1]! : null,
    next: index < sorted.length - 1 ? sorted[index + 1]! : null,
  };
}
