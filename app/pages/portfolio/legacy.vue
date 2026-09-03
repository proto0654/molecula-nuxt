<script setup lang="ts">
import { restoreArchiveScroll } from '~/lib/navigation/archiveReturn';
import { categoryNameMap } from '~/domain/portfolio/archive';
import { withCountLabel } from '~/domain/portfolio/shelf';

const route = useRoute();

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
    shelf: 'legacy',
  });
const { data: categories } = usePortfolioCategories();

const categoryById = computed(() => categoryNameMap(categories.value));

onMounted(() => {
  restoreArchiveScroll('portfolio-legacy');
});

useArchivePaginationScroll(page, pending);

const { revealing } = usePageContentReveal();

const headingLabel = useUiString('portfolio_heading_legacy');
const currentLinkLabel = useUiString('portfolio_link_current');
const archiveDescription = useUiString('portfolio_archive_description');

const archiveTitle = computed(() =>
  withCountLabel(headingLabel.value, counts.value.legacy),
);

const currentLinkText = computed(() =>
  withCountLabel(currentLinkLabel.value, counts.value.current),
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

const indexKicker = useUiString('chrome_index_kicker');
const { localizedPath } = useLocale();
const portfolioHref = computed(() => localizedPath('/portfolio'));
const legacyBase = computed(() => localizedPath('/portfolio/legacy'));
</script>

<template>
  <ArchiveShell :revealing="revealing" archive-scope="portfolio-legacy">
    <header class="archive-heading">
      <p class="archive-heading__kicker">{{ indexKicker }}</p>
      <SiteScrambleTitle class="archive-heading__title" :text="archiveTitle" />
      <p class="archive-heading__switch">
        <NuxtLink :to="portfolioHref" class="archive-heading__switch-link">
          {{ currentLinkText }}
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
        archive-scope="portfolio-legacy"
      />
    </ul>

    <ArchivePagination
      v-if="entries.length"
      :page="page"
      :total-pages="pagination.totalPages"
      :base-path="legacyBase"
    />
  </ArchiveShell>
</template>
