<script setup lang="ts">
import { restoreArchiveScroll } from '~/lib/navigation/archiveReturn';

const route = useRoute();

const page = computed(() => {
  const raw = route.query.page;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(String(value ?? '1'), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
});

const { entries, pagination, pending, error } = useServices({ page, perPage: 12 });

function restoreScroll() {
  restoreArchiveScroll('services');
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
  title: 'Услуги — WebLaba',
  description: 'Услуги WebLaba',
});
</script>

<template>
  <ArchiveShell :revealing="revealing">
    <header class="archive-heading">
      <p class="archive-heading__kicker">Index</p>
      <SiteScrambleTitle class="archive-heading__title" text="Услуги" />
    </header>

    <p v-if="pending && !entries.length" class="archive-status">Loading…</p>

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
      :page="page"
      :total-pages="pagination.totalPages"
      base-path="/services"
    />
  </ArchiveShell>
</template>
