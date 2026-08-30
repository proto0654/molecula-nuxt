import {
  beginArchivePagination,
  endArchivePagination,
  isArchivePaginating,
} from '~/lib/navigation/archiveReturn';

/**
 * Scroll archive index to top on page change, then release listing reveal
 * after the new rows mount. Mirrors archive-return scroll gating (MOTION.md).
 */
export function useArchivePaginationScroll(
  page: Ref<number> | ComputedRef<number>,
  pending: Ref<boolean>,
) {
  watch(page, async (_next, prev) => {
    if (!import.meta.client || prev == null) return;
    beginArchivePagination();
    await nextTick();
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (!pending.value) {
      requestAnimationFrame(() => endArchivePagination());
    }
  });

  watch(pending, (isPending, wasPending) => {
    if (!import.meta.client || isPending || !wasPending) return;
    if (!isArchivePaginating()) return;
    void nextTick().then(() => {
      requestAnimationFrame(() => endArchivePagination());
    });
  });
}
