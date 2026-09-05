import {
  getPortfolioPostsByIds,
  getPortfolioCategories,
  getPortfolioSlimIndex,
} from '~/api/portfolio';
import { preferStaticCachedData } from '~/composables/preferStaticCachedData';
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

type ArchiveShelfPayload = {
  entries: ArchiveEntry[];
  counts: { current: number; legacy: number };
};

/**
 * Full-shelf archive payload (SSG once per locale+shelf), then client page slice.
 * Query `?page=N` cannot be prerendered as separate Nitro routes.
 */
export function usePortfolio(options: UsePortfolioOptions = {}) {
  const { locale } = useLocale();
  const nuxtApp = useNuxtApp();
  const perPage = options.perPage ?? 12;
  const shelf: PortfolioShelf = options.shelf ?? 'current';
  const pageSource = options.page ?? 1;

  const pageRef = computed(() => {
    const v = unref(pageSource);
    const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  });

  const { data, pending, error, refresh } = useAsyncData(
    () => `portfolio-archive-${locale.value}-${shelf}`,
    async (): Promise<ArchiveShelfPayload> => {
      const [rawSlim, rawCats] = await Promise.all([
        getPortfolioSlimIndex(),
        getPortfolioCategories(),
      ]);
      const legacyId = resolveLegacyCategoryId(rawCats);
      const sorted = sortPortfolioSlimIndex(rawSlim);
      const counts = shelfCounts(sorted, legacyId);
      const slim = filterSlimByShelf(sorted, shelf, legacyId);
      const posts = await getPortfolioPostsByIds(slim.map((item) => item.id));
      const byId = new Map(posts.map((post) => [post.id, post]));
      const entries: ArchiveEntry[] = [];
      for (let i = 0; i < slim.length; i += 1) {
        const slimItem = slim[i]!;
        const raw = byId.get(slimItem.id);
        if (!raw) continue;
        entries.push({
          item: normalizePortfolioPost(raw, locale.value),
          index: i + 1,
        });
      }
      return { entries, counts };
    },
    {
      watch: [locale],
      getCachedData(key, app, ctx) {
        return preferStaticCachedData<ArchiveShelfPayload>(
          key,
          app ?? nuxtApp,
          ctx,
        );
      },
    },
  );

  const held = shallowRef<ArchiveShelfPayload | null>(null);
  watch(
    data,
    (value) => {
      if (value) held.value = value;
    },
    { immediate: true },
  );

  const allEntries = computed(
    () => data.value?.entries ?? held.value?.entries ?? [],
  );

  const pagination = computed((): WpPaginationMeta => {
    const total = allEntries.value.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage) || 1);
    return { total, totalPages };
  });

  const pageClamped = computed(() =>
    Math.min(pageRef.value, pagination.value.totalPages),
  );

  const transitioning = computed(() => false);

  const entries = computed(() => {
    const start = (pageClamped.value - 1) * perPage;
    return allEntries.value.slice(start, start + perPage);
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
  const nuxtApp = useNuxtApp();
  return useAsyncData(
    'portfolio-categories',
    async () => {
      const cats = await getPortfolioCategories();
      return cats.map(normalizePortfolioCategory) as PortfolioCategory[];
    },
    {
      getCachedData(key, app, ctx) {
        return preferStaticCachedData<PortfolioCategory[]>(
          key,
          app ?? nuxtApp,
          ctx,
        );
      },
    },
  );
}
