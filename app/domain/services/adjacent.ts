import type { ServiceSlimItem } from '~/api/services';

export type AdjacentServices = {
  prev: ServiceSlimItem | null;
  next: ServiceSlimItem | null;
};

/**
 * Production order: menu_order ASC, then date ASC among ties (oldest first).
 * Do not use archive-page array index.
 */
export function sortServiceSlimIndex(items: ServiceSlimItem[]): ServiceSlimItem[] {
  return [...items].sort((a, b) => {
    if (a.menu_order !== b.menu_order) return a.menu_order - b.menu_order;
    return a.date.localeCompare(b.date);
  });
}

export type ServicePosition = AdjacentServices & {
  /** 1-based index in production order; null if slug is missing from the index. */
  index: number | null;
  total: number;
};

export function getServicePosition(
  slug: string,
  slimIndex: ServiceSlimItem[],
): ServicePosition {
  const sorted = sortServiceSlimIndex(slimIndex);
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
