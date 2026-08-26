import { getPortfolioPostsByIds, getPortfolioCategories, getPortfolioSlimIndex } from '~/api/portfolio';
import { sortPortfolioSlimIndex } from '~/domain/portfolio/adjacent';
import {
  normalizePortfolioPost,
  normalizePortfolioCategory,
} from '~/domain/portfolio/normalizePortfolio';
import type { ArchiveEntry } from '~/domain/portfolio/archive';
import type { PortfolioCategory } from '~/types/wp';
import type { WpPaginationMeta } from '~/api/client';

export type UsePortfolioOptions = {
  page?: number | Ref<number> | ComputedRef<number>;
  perPage?: number;
};

type ArchivePagePayload = {
  entries: ArchiveEntry[];
  pagination: WpPaginationMeta;
};

/**
 * Slim-index paginated archive. Order matches CASE / NN
 * (`menu_order ASC`, then `date DESC`).
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
    () => `portfolio-archive-${pageRef.value}-${perPage}`,
    async (): Promise<ArchivePagePayload> => {
      const slim = sortPortfolioSlimIndex(await getPortfolioSlimIndex());
      const total = slim.length;
      const totalPages = Math.max(1, Math.ceil(total / perPage) || 1);
      const page = Math.min(pageRef.value, totalPages);
      const start = (page - 1) * perPage;
      const slice = slim.slice(start, start + perPage);
      const posts = await getPortfolioPostsByIds(slice.map((item) => item.id));
      const byId = new Map(posts.map((post) => [post.id, post]));
      const entries: ArchiveEntry[] = [];
      for (let i = 0; i < slice.length; i += 1) {
        const slimItem = slice[i]!;
        const raw = byId.get(slimItem.id);
        if (!raw) continue;
        entries.push({
          item: normalizePortfolioPost(raw),
          index: start + i + 1,
        });
      }
      return {
        entries,
        pagination: { total, totalPages },
      };
    },
    { watch: [pageRef] },
  );

  const held = shallowRef<ArchivePagePayload | null>(null);
  watch(
    data,
    (value) => {
      if (value) held.value = value;
    },
    { immediate: true },
  );

  const entries = computed(
    () => data.value?.entries ?? held.value?.entries ?? [],
  );
  const pagination = computed(
    (): WpPaginationMeta =>
      data.value?.pagination ??
      held.value?.pagination ?? { total: 0, totalPages: 0 },
  );

  return {
    entries,
    pagination,
    pending,
    error,
    refresh,
  };
}

/** Optional category name map for archive meta. */
export function usePortfolioCategories() {
  return useAsyncData('portfolio-categories', async () => {
    const cats = await getPortfolioCategories();
    return cats.map(normalizePortfolioCategory) as PortfolioCategory[];
  });
}
