<script setup lang="ts">
import { getPortfolioCase, getPortfolioSlimIndex } from '~/api/portfolio';
import { getCasePosition } from '~/domain/portfolio/adjacent';
import {
  caseExcerptPlain,
  normalizePortfolioPost,
} from '~/domain/portfolio/normalizePortfolio';
import {
  caseFeaturedBackdropUrl,
  getCaseComposition,
  getCaseHeroKind,
  getCaseHeroLayout,
} from '~/domain/portfolio/presentation';

const route = useRoute();
const slug = computed(() => String(route.params.slug || ''));

provideCaseLightbox();

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

const held = shallowRef(data.value ?? null);
watch(
  data,
  (value) => {
    if (value) held.value = value;
  },
  { immediate: true },
);

const caseData = computed(() => held.value?.caseData ?? null);
const position = computed(() => held.value?.position);
const heroKind = computed(() => (caseData.value ? getCaseHeroKind(caseData.value) : null));
const heroLayout = computed(() => getCaseHeroLayout(heroKind.value));
const backdropUrl = computed(() =>
  caseData.value ? caseFeaturedBackdropUrl(caseData.value) : null,
);
const composition = computed(() =>
  caseData.value ? getCaseComposition(caseData.value) : null,
);
const sections = computed(
  () =>
    composition.value?.numbers ?? {
      content: 0,
      gallery: 0,
      mobile: 0,
      slices: 0,
      next: 0,
    },
);

const ready = computed(
  () => Boolean(data.value?.caseData) && data.value?.caseData?.slug === slug.value,
);

const { appliedAccent, bodyClass, phase } = useCasePageTransition({
  accentColor: () => caseData.value?.accentColor,
  ready,
});

/** Title scramble after pose settle and case body idle (not under exit veil). */
const titleReady = computed(
  () => ready.value && phase.value === 'idle',
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
    :accent-color="appliedAccent"
    :case-index="position?.index"
    :backdrop-url="backdropUrl"
    :visual-slug="caseData?.featuredImage ? slug : null"
    :sparse="composition?.sparse"
    :text-hero="composition?.textHero"
    :has-slices="composition?.hasSlices"
    :landing-only="composition?.landingOnly"
    :body-class="bodyClass"
  >
    <p v-if="!caseData && pending" class="case-page__status">Loading…</p>

    <p
      v-else-if="error && !caseData && (!('statusCode' in error) || error.statusCode !== 404)"
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
          :show-meta="!sections.content"
          :reveal-ready="titleReady"
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
        :section-index="sections.next"
        :prev-slug="position?.prev?.slug ?? null"
        :next-slug="position?.next?.slug ?? null"
        :prev-title="position?.prev?.title ?? null"
        :next-title="position?.next?.title ?? null"
      />
      <CaseLightbox />
    </template>
  </CaseShell>
</template>
