<script setup lang="ts">
import { getPortfolioCase, getPortfolioSlimIndex } from '~/api/portfolio';
import { getCasePosition } from '~/domain/portfolio/adjacent';
import {
  caseExcerptPlain,
  normalizePortfolioPost,
} from '~/domain/portfolio/normalizePortfolio';
import {
  getCaseHeroKind,
  getCaseHeroLayout,
  getCaseSectionNumbers,
} from '~/domain/portfolio/presentation';

const route = useRoute();
const slug = computed(() => String(route.params.slug || ''));

const { data, pending, error } = useAsyncData(
  () => `portfolio-case-${slug.value}`,
  async () => {
    if (!slug.value) {
      throw createError({ statusCode: 404, statusMessage: 'Case not found', fatal: true });
    }
    const raw = await getPortfolioCase(slug.value);
    if (!raw) {
      throw createError({ statusCode: 404, statusMessage: 'Case not found', fatal: true });
    }
    const caseData = normalizePortfolioPost(raw);
    const slim = await getPortfolioSlimIndex();
    const position = getCasePosition(slug.value, slim);
    return { caseData, position };
  },
  { watch: [slug] },
);

const caseData = computed(() => data.value?.caseData ?? null);
const position = computed(() => data.value?.position);
const heroKind = computed(() => (caseData.value ? getCaseHeroKind(caseData.value) : null));
const heroLayout = computed(() => getCaseHeroLayout(heroKind.value));
const sections = computed(() =>
  caseData.value
    ? getCaseSectionNumbers(caseData.value)
    : { content: 0, gallery: 0, mobile: 0, slices: 0 },
);

const pageTitle = computed(() => {
  const c = caseData.value;
  if (!c) return 'Молекула';
  const plainTitle = c.title.replace(/<[^>]*>/g, '').trim() || c.slug;
  return `${plainTitle} — WebLaba`;
});

const pageDescription = computed(() => {
  const c = caseData.value;
  return c ? caseExcerptPlain(c) ?? undefined : undefined;
});

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
});
</script>

<template>
  <CaseShell
    :accent-color="caseData?.accentColor"
    :case-index="position?.index"
  >
    <p v-if="pending" class="case-page__status">Loading…</p>

    <p
      v-else-if="error && (!('statusCode' in error) || error.statusCode !== 404)"
      class="case-page__status"
    >
      Case unavailable.<br />
      Try again later.
    </p>

    <template v-else-if="caseData">
      <div class="case-grid case-hero" :class="`case-hero--${heroLayout}`">
        <CaseHeader
          class="case-hero__text"
          :case-data="caseData"
          :case-index="position?.index"
        />
        <CaseHeroMedia
          v-if="heroKind"
          class="case-hero__visual"
          :case-data="caseData"
          :kind="heroKind"
        />
      </div>

      <CaseContent
        v-if="sections.content"
        :case-data="caseData"
        :section-index="sections.content"
      />
      <CaseGallery
        v-if="sections.gallery"
        :case-data="caseData"
        :section-index="sections.gallery"
      />
      <CaseMobile
        v-if="sections.mobile"
        :case-data="caseData"
        :section-index="sections.mobile"
      />
      <CaseSlices
        v-if="sections.slices"
        :case-data="caseData"
        :section-index="sections.slices"
      />
      <CaseNavigation
        :prev-slug="position?.prev?.slug ?? null"
        :next-slug="position?.next?.slug ?? null"
        :prev-title="position?.prev?.title ?? null"
        :next-title="position?.next?.title ?? null"
      />
    </template>
  </CaseShell>
</template>
