import {
  getPortfolioPostsByIds,
  getPortfolioCategories,
  getPortfolioSlimIndex,
} from '~/api/portfolio';
import { sortPortfolioSlimIndex } from '~/domain/portfolio/adjacent';
import {
  normalizePortfolioPost,
  normalizePortfolioCategory,
} from '~/domain/portfolio/normalizePortfolio';
import type { ArchiveEntry } from '~/domain/portfolio/archive';
import {
  filterSlimByShelf,
  resolveLegacyCategoryId,
  shelfCounts,
  type PortfolioShelf,
} from '~/domain/portfolio/shelf';
import type { PortfolioCategory } from '~/types/wp';
import type { WpPaginationMeta } from '~/api/client';

export type UsePortfolioOptions = {
  page?: number | Ref<number> | ComputedRef<number>;
  perPage?: number;
  /** Current (non-legacy) vs legacy category shelf. Default: current. */
  shelf?: PortfolioShelf;
};

type ArchivePagePayload = {
  entries: ArchiveEntry[];
  pagination: WpPaginationMeta;
  counts: { current: number; legacy: number };
};

/**
 * Slim-index paginated archive. Order matches CASE / NN within the shelf
 * (`menu_order ASC`, then `date DESC`).
 */
export function usePortfolio(options: UsePortfolioOptions = {}) {
  const perPage = options.perPage ?? 12;
  const shelf: PortfolioShelf = options.shelf ?? 'current';
  const pageSource = options.page ?? 1;

  const pageRef = computed(() => {
    const v = unref(pageSource);
    const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  });

  const { data, pending, error, refresh } = useAsyncData(
    () => `portfolio-archive-${shelf}-${pageRef.value}-${perPage}`,
    async (): Promise<ArchivePagePayload> => {
      const [rawSlim, rawCats] = await Promise.all([
        getPortfolioSlimIndex(),
        getPortfolioCategories(),
      ]);
      const legacyId = resolveLegacyCategoryId(rawCats);
      const sorted = sortPortfolioSlimIndex(rawSlim);
      const counts = shelfCounts(sorted, legacyId);
      const slim = filterSlimByShelf(sorted, shelf, legacyId);
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
        counts,
      };
    },
    { watch: [pageRef] },
  );

  const held = shallowRef<ArchivePagePayload | null>(null);
  const heldPage = shallowRef<number | null>(null);
  const dataPage = shallowRef<number | null>(null);
  watch(
    data,
    (value) => {
      if (value) {
        held.value = value;
        heldPage.value = pageRef.value;
        dataPage.value = pageRef.value;
      }
    },
    { immediate: true },
  );

  const transitioning = computed(() => dataPage.value !== pageRef.value);

  const entries = computed(() => {
    if (data.value?.entries && dataPage.value === pageRef.value) {
      return data.value.entries;
    }
    if (heldPage.value === pageRef.value) return held.value?.entries ?? [];
    return [];
  });
  const pagination = computed((): WpPaginationMeta => {
    if (data.value?.pagination && dataPage.value === pageRef.value) {
      return data.value.pagination;
    }
    if (heldPage.value === pageRef.value) {
      return held.value?.pagination ?? { total: 0, totalPages: 0 };
    }
    return held.value?.pagination ?? { total: 0, totalPages: 0 };
  });

  const counts = computed(
    () =>
      data.value?.counts ??
      held.value?.counts ?? { current: 0, legacy: 0 },
  );

  return {
    entries,
    pagination,
    counts,
    pending,
    transitioning,
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
