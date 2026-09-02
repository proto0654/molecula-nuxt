<script setup lang="ts">
import { restoreArchiveScroll } from '~/lib/navigation/archiveReturn';

const route = useRoute();

const page = computed(() => {
  const raw = route.query.page;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(String(value ?? '1'), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
});

const { entries, pagination, pending, transitioning, error } = useServices({
  page,
  perPage: 12,
});

function restoreScroll() {
  restoreArchiveScroll('services');
}

onMounted(() => {
  restoreScroll();
});

useArchivePaginationScroll(page, pending);

const { revealing } = usePageContentReveal();

const archiveTitle = useUiString('services_heading_archive', 'Услуги');
const archiveDescription = useUiString(
  'services_archive_description',
  'Разработка и дизайн цифровых продуктов — услуги студии WebLaba',
);

const pageTitle = computed(() =>
  page.value > 1
    ? `${archiveTitle.value} — страница ${page.value}`
    : archiveTitle.value,
);

usePageSeo({
  title: pageTitle,
  description: archiveDescription,
});
</script>

<template>
  <ArchiveShell :revealing="revealing">
    <header class="archive-heading">
      <p class="archive-heading__kicker">Index</p>
      <SiteScrambleTitle class="archive-heading__title" :text="archiveTitle" />
    </header>

    <p v-if="(pending || transitioning) && !entries.length" class="archive-status">
      Loading…
    </p>

    <p v-else-if="error && !entries.length" class="archive-status">
      Services unavailable.<br />
      Try again later.
    </p>

    <p v-else-if="!pending && !entries.length" class="archive-status">
      No services found.
    </p>

    <ul v-if="entries.length" class="archive-list" :aria-busy="pending">
      <ServiceArchiveRow
        v-for="(entry, i) in entries"
        :key="entry.item.id"
        :entry="entry"
        :page="page"
        :eager="i < 2"
      />
    </ul>

    <ArchivePagination
      v-if="entries.length"
      :page="page"
      :total-pages="pagination.totalPages"
      base-path="/services"
    />
  </ArchiveShell>
</template>
