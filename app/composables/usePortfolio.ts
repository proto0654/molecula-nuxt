import { getPortfolioPage, getPortfolioCategories } from '~/api/portfolio';
import {
  normalizePortfolioPost,
  normalizePortfolioCategory,
} from '~/domain/portfolio/normalizePortfolio';
import type { Case, PortfolioCategory } from '~/types/wp';
import type { WpPaginationMeta } from '~/api/client';

export type UsePortfolioOptions = {
  page?: number | Ref<number> | ComputedRef<number>;
  perPage?: number;
};

/**
 * Server-paginated portfolio archive. Uses WP headers for totals.
 */
export function usePortfolio(options: UsePortfolioOptions = {}) {
  const perPage = options.perPage ?? 12;
  const pageSource = options.page ?? 1;

  const pageRef = computed(() => {
    const v = unref(pageSource);
    const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  });

  const { data, pending, error, refresh } = useAsyncData(
    () => `portfolio-page-${pageRef.value}-${perPage}`,
    async () => {
      const result = await getPortfolioPage({ page: pageRef.value, perPage });
      return {
        cases: result.data.map(normalizePortfolioPost) as Case[],
        pagination: result.pagination as WpPaginationMeta,
      };
    },
    { watch: [pageRef] },
  );

  const cases = computed(() => data.value?.cases ?? []);
  const pagination = computed(
    (): WpPaginationMeta => data.value?.pagination ?? { total: 0, totalPages: 0 },
  );

  return {
    cases,
    pagination,
    pending,
    error,
    refresh,
  };
}

/** Optional category name map for archive cards. */
export function usePortfolioCategories() {
  return useAsyncData('portfolio-categories', async () => {
    const cats = await getPortfolioCategories();
    return cats.map(normalizePortfolioCategory) as PortfolioCategory[];
  });
}
