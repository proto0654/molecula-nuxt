<script setup lang="ts">
import { restoreArchiveScroll } from '~/lib/navigation/archiveReturn';
import { categoryNameMap } from '~/domain/portfolio/archive';

const route = useRoute();

const page = computed(() => {
  const raw = route.query.page;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(String(value ?? '1'), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
});

const { entries, pagination, pending, transitioning, error } = usePortfolio({
  page,
  perPage: 12,
});
const { data: categories } = usePortfolioCategories();

const categoryById = computed(() => categoryNameMap(categories.value));

function restoreScroll() {
  restoreArchiveScroll();
}

onMounted(() => {
  restoreScroll();
});

useArchivePaginationScroll(page, pending);

const { revealing } = usePageContentReveal();
const { washesReady } = usePortfolioWashGate();

const pageTitle = computed(() =>
  page.value > 1 ? `Портфолио — страница ${page.value}` : 'Портфолио',
);

usePageSeo({
  title: pageTitle,
  description: 'Кейсы и проекты студии WebLaba — портфолио веб-разработки и дизайна',
});
</script>

<template>
  <ArchiveShell :revealing="revealing" :washes-ready="washesReady">
    <header class="archive-heading">
      <p class="archive-heading__kicker">Index</p>
      <SiteScrambleTitle class="archive-heading__title" text="Портфолио" />
    </header>

    <p v-if="(pending || transitioning) && !entries.length" class="archive-status">
      Loading…
    </p>

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
      v-if="entries.length"
      :page="page"
      :total-pages="pagination.totalPages"
    />
  </ArchiveShell>
</template>
