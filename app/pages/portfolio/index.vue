<script setup lang="ts">
import { consumeArchiveReturn } from '~/lib/navigation/archiveReturn';
import { categoryNameMap } from '~/domain/portfolio/archive';
import { prefersReducedMotion } from '~/lib/a11y/reducedMotion';

const route = useRoute();

const page = computed(() => {
  const raw = route.query.page;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(String(value ?? '1'), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
});

const { entries, pagination, pending, error } = usePortfolio({ page, perPage: 12 });
const { data: categories } = usePortfolioCategories();

const categoryById = computed(() => categoryNameMap(categories.value));

function restoreScroll() {
  const restored = consumeArchiveReturn();
  if (!restored) return;
  const reduced = prefersReducedMotion();
  requestAnimationFrame(() => {
    const row = document.querySelector<HTMLElement>(
      `[data-slug="${CSS.escape(restored.slug)}"]`,
    );
    if (row) {
      row.scrollIntoView({
        block: 'center',
        behavior: reduced ? 'auto' : 'smooth',
      });
      return;
    }
    window.scrollTo({ top: restored.y, behavior: reduced ? 'auto' : 'smooth' });
  });
}

onMounted(() => {
  restoreScroll();
});

watch(page, (_next, prev) => {
  if (!import.meta.client || prev == null) return;
  window.scrollTo(0, 0);
});

const { revealing } = usePageContentReveal();

useSeoMeta({
  title: 'Портфолио — WebLaba',
  description: 'Архив проектов WebLaba',
});
</script>

<template>
  <ArchiveShell :revealing="revealing">
    <header class="archive-heading">
      <p class="archive-heading__kicker">Index</p>
      <SiteScrambleTitle class="archive-heading__title" text="Portfolio" />
    </header>

    <p v-if="pending && !entries.length" class="archive-status">Loading…</p>

    <p v-else-if="error && !entries.length" class="archive-status">
      Portfolio unavailable.<br />
      Try again later.
    </p>

    <p v-else-if="!pending && !entries.length" class="archive-status">
      No projects found.
    </p>

    <ul v-if="entries.length" class="archive-list" :aria-busy="pending">
      <ArchiveRow
        v-for="(entry, i) in entries"
        :key="entry.item.id"
        :entry="entry"
        :page="page"
        :eager="i < 2"
        :category-by-id="categoryById"
      />
    </ul>

    <ArchivePagination
      :page="page"
      :total-pages="pagination.totalPages"
    />
  </ArchiveShell>
</template>
