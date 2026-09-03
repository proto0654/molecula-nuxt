<script setup lang="ts">
import { getPortfolioCase } from '~/api/portfolio';
import { resolveAdjacentFlipDirection, useCasePageTransition } from '~/composables/useCasePageTransition';
import {
  caseExcerptPlain,
  normalizePortfolioPost,
} from '~/domain/portfolio/normalizePortfolio';
import {
  caseImageUrl,
  CASE_SCREEN_SIZES,
  getCaseComposition,
  stripTags,
} from '~/domain/portfolio/presentation';
import { resolveCaseHeroMedia } from '~/domain/editorialHero';

const route = useRoute();
const slug = computed(() => String(route.params.slug || ''));

const { position, archiveScope, positionForSlug } = usePortfolioCaseNav(slug);

provideCaseLightbox();

const { data, pending, error } = useAsyncData(
  () => `portfolio-case-${slug.value}`,
  async () => {
    if (!slug.value) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Case not found',
        fatal: true,
      });
    }
    const raw = await getPortfolioCase(slug.value);
    if (!raw) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Case not found',
        fatal: true,
      });
    }
    return normalizePortfolioPost(raw);
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

const caseData = computed(() => held.value ?? null);

const backToArchiveLabel = useUiString('case_back_to_portfolio');

const heroMedia = computed(() =>
  caseData.value
    ? resolveCaseHeroMedia(caseData.value)
    : { kind: 'placeholder' as const },
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
      signature: 0,
      slices: 0,
      next: 0,
    },
);

const ready = computed(
  () => Boolean(data.value) && data.value?.slug === slug.value,
);

const { appliedAccent, bodyClass, contentRevealReady } = useCasePageTransition({
  accentColor: () => caseData.value?.accentColor,
  ready,
  resolveFlipDirection: (fromSlug, toSlug) =>
    resolveAdjacentFlipDirection(fromSlug, toSlug, (from) =>
      positionForSlug(from),
    ),
});

const awaitingPose = useAwaitingPose();
provideCaseMotionGate(
  computed(() => contentRevealReady.value && !awaitingPose.value),
);

const { revealing } = usePageContentReveal();

/** Title scramble — as soon as payload is ready (parallel to exit veil / light sweep). */
const titleReady = computed(
  () => contentRevealReady.value && !awaitingPose.value,
);

const pageRevealing = computed(
  () => revealing.value && contentRevealReady.value,
);

const pageTitle = computed(() => {
  const c = caseData.value;
  if (!c) return null;
  return stripTags(c.title) || c.slug;
});

const pageDescription = computed(() => {
  const c = caseData.value;
  if (!c) return undefined;
  const plain = pageTitle.value;
  return (
    caseExcerptPlain(c) ??
    (plain ? `Кейс «${plain}» — портфолио WebLaba` : undefined)
  );
});

const ogImage = computed(() => {
  const image = caseData.value?.featuredImage;
  if (!image) return undefined;
  return absoluteMediaUrl(caseImageUrl(image, CASE_SCREEN_SIZES));
});

usePageSeo({
  title: pageTitle,
  description: pageDescription,
  ogImage,
  deferTitle: true,
  ogType: 'article',
});

const caseShellRef = ref<{ root: HTMLElement | null } | null>(null);

useCaseVideoBoot({
  enabled: computed(
    () =>
      heroMedia.value.kind === 'video' &&
      titleReady.value &&
      Boolean(caseData.value),
  ),
  revealing: pageRevealing,
  root: computed(() => caseShellRef.value?.root ?? null),
});

onMounted(() => {
  if (import.meta.client) {
    window.scrollTo(0, 0);
  }
});
</script>

<template>
  <CaseShell
    ref="caseShellRef"
    :accent-color="appliedAccent"
    :case-index="position.index"
    :sparse="composition?.sparse"
    :has-slices="composition?.hasSlices"
    :landing-only="composition?.landingOnly"
    :body-class="bodyClass"
    :revealing="pageRevealing"
    :archive-scope="archiveScope"
  >
    <p v-if="!caseData && pending" class="case-page__status">Loading…</p>

    <p
      v-else-if="
        error &&
        !caseData &&
        (!('statusCode' in error) || error.statusCode !== 404)
      "
      class="case-page__status"
    >
      Case unavailable.<br />
      Try again later.
    </p>

    <template v-else-if="caseData">
      <EditorialHero :media="heroMedia" variant="case">
        <CaseHeader
          :case-data="caseData"
          :show-meta="!sections.content"
          :reveal-ready="titleReady"
        />
      </EditorialHero>

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
      <CaseMobileSignature
        v-if="sections.signature"
        :case-data="caseData"
        :section-index="sections.signature"
      />
      <CaseSlices
        v-if="sections.slices"
        :case-data="caseData"
        :section-index="sections.slices"
      />
      <CaseThanks />
      <ArchiveDetailNav
        :section-index="sections.next"
        :prev-slug="position.prev?.slug ?? null"
        :next-slug="position.next?.slug ?? null"
        :prev-title="position.prev?.title ?? null"
        :next-title="position.next?.title ?? null"
        base-path="/portfolio"
        :index-label="backToArchiveLabel"
        :archive-scope="archiveScope"
        aria-label="Навигация по кейсам"
      />
      <CaseLightbox />
    </template>
  </CaseShell>
</template>
