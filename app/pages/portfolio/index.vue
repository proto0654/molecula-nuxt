<script setup lang="ts">
import { restoreArchiveScroll } from '~/lib/navigation/archiveReturn';
import { categoryNameMap } from '~/domain/portfolio/archive';
import { withCountLabel } from '~/domain/portfolio/shelf';

const route = useRoute();
const { localizedPath } = useLocale();

const page = computed(() => {
  const raw = route.query.page;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(String(value ?? '1'), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
});

const { entries, pagination, counts, pending, transitioning, error } =
  usePortfolio({
    page,
    perPage: 12,
    shelf: 'current',
  });
const { data: categories } = usePortfolioCategories();

const categoryById = computed(() => categoryNameMap(categories.value));

onMounted(() => {
  restoreArchiveScroll('portfolio');
});

useArchivePaginationScroll(page, pending);

const { revealing } = usePageContentReveal();

const indexKicker = useUiString('chrome_index_kicker');
const headingLabel = useUiString('portfolio_heading_current');
const legacyLinkLabel = useUiString('portfolio_heading_legacy');
const archiveDescription = useUiString('portfolio_archive_description');

const archiveTitle = computed(() =>
  withCountLabel(headingLabel.value, counts.value.current),
);

const legacyLinkText = computed(() =>
  withCountLabel(legacyLinkLabel.value, counts.value.legacy),
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

const portfolioBase = computed(() => localizedPath('/portfolio'));
const legacyHref = computed(() => localizedPath('/portfolio/legacy'));
</script>

<template>
  <ArchiveShell :revealing="revealing">
    <header class="archive-heading">
      <p class="archive-heading__kicker">{{ indexKicker }}</p>
      <SiteScrambleTitle class="archive-heading__title" :text="archiveTitle" />
      <p v-if="counts.legacy > 0" class="archive-heading__switch">
        <NuxtLink :to="legacyHref" class="archive-heading__switch-link">
          {{ legacyLinkText }}
        </NuxtLink>
      </p>
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
        archive-scope="portfolio"
      />
    </ul>

    <ArchivePagination
      v-if="entries.length"
      :page="page"
      :total-pages="pagination.totalPages"
      :base-path="portfolioBase"
    />
  </ArchiveShell>
</template>
