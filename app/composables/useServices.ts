import { getServicePostsByIds, getServiceSlimIndex } from '~/api/services';
import { sortServiceSlimIndex } from '~/domain/services/adjacent';
import { normalizeServicePost } from '~/domain/services/normalizeService';
import type { ServiceArchiveEntry } from '~/domain/services/archive';
import type { WpPaginationMeta } from '~/api/client';

export type UseServicesOptions = {
  page?: number | Ref<number> | ComputedRef<number>;
  perPage?: number;
};

type ArchivePagePayload = {
  entries: ServiceArchiveEntry[];
  pagination: WpPaginationMeta;
};

/**
 * Slim-index paginated archive. Order matches SERVICE / NN
 * (`menu_order ASC`, then `date DESC`).
 */
export function useServices(options: UseServicesOptions = {}) {
  const perPage = options.perPage ?? 12;
  const pageSource = options.page ?? 1;

  const pageRef = computed(() => {
    const v = unref(pageSource);
    const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  });

  const { data, pending, error, refresh } = useAsyncData(
    () => `services-archive-${pageRef.value}-${perPage}`,
    async (): Promise<ArchivePagePayload> => {
      const slim = sortServiceSlimIndex(await getServiceSlimIndex());
      const total = slim.length;
      const totalPages = Math.max(1, Math.ceil(total / perPage) || 1);
      const page = Math.min(pageRef.value, totalPages);
      const start = (page - 1) * perPage;
      const slice = slim.slice(start, start + perPage);
      const posts = await getServicePostsByIds(slice.map((item) => item.id));
      const byId = new Map(posts.map((post) => [post.id, post]));
      const entries: ServiceArchiveEntry[] = [];
      for (let i = 0; i < slice.length; i += 1) {
        const slimItem = slice[i]!;
        const raw = byId.get(slimItem.id);
        if (!raw) continue;
        entries.push({
          item: normalizeServicePost(raw),
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
