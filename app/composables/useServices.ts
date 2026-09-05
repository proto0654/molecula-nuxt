import { getServicePostsByIds, getServiceSlimIndex } from '~/api/services';
import { preferStaticCachedData } from '~/composables/preferStaticCachedData';
import { sortServiceSlimIndex } from '~/domain/services/adjacent';
import { normalizeServicePost } from '~/domain/services/normalizeService';
import type { ServiceArchiveEntry } from '~/domain/services/archive';
import type { WpPaginationMeta } from '~/api/client';

export type UseServicesOptions = {
  page?: number | Ref<number> | ComputedRef<number>;
  perPage?: number;
};

type ArchiveShelfPayload = {
  entries: ServiceArchiveEntry[];
};

/**
 * Full services archive payload (SSG once per locale), then client page slice.
 * Query `?page=N` cannot be prerendered as separate Nitro routes.
 */
export function useServices(options: UseServicesOptions = {}) {
  const { locale } = useLocale();
  const nuxtApp = useNuxtApp();
  const perPage = options.perPage ?? 12;
  const pageSource = options.page ?? 1;

  const pageRef = computed(() => {
    const v = unref(pageSource);
    const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  });

  const { data, pending, error, refresh } = useAsyncData(
    () => `services-archive-${locale.value}`,
    async (): Promise<ArchiveShelfPayload> => {
      const slim = sortServiceSlimIndex(await getServiceSlimIndex());
      const posts = await getServicePostsByIds(slim.map((item) => item.id));
      const byId = new Map(posts.map((post) => [post.id, post]));
      const entries: ServiceArchiveEntry[] = [];
      for (let i = 0; i < slim.length; i += 1) {
        const slimItem = slim[i]!;
        const raw = byId.get(slimItem.id);
        if (!raw) continue;
        entries.push({
          item: normalizeServicePost(raw, locale.value),
          index: i + 1,
        });
      }
      return { entries };
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

  return {
    entries,
    pagination,
    pending,
    transitioning,
    error,
    refresh,
  };
}
