<script setup lang="ts">
import { getServiceBySlug, getServiceSlimIndex, getThemeOptions } from '~/api';
import { getServicePosition } from '~/domain/services/adjacent';
import {
  getServiceComposition,
  normalizeServiceChrome,
  normalizeServicePost,
  serviceExcerptPlain,
} from '~/domain/services';
import { stripTags } from '~/domain/portfolio/presentation';

const route = useRoute();
const slug = computed(() => String(route.params.slug || ''));

const { data, pending, error } = useAsyncData(
  () => `service-${slug.value}`,
  async () => {
    if (!slug.value) {
      throw createError({ statusCode: 404, statusMessage: 'Service not found', fatal: true });
    }
    const raw = await getServiceBySlug(slug.value);
    if (!raw) {
      throw createError({ statusCode: 404, statusMessage: 'Service not found', fatal: true });
    }
    const service = normalizeServicePost(raw);
    const slim = await getServiceSlimIndex();
    const position = getServicePosition(slug.value, slim);
    return { service, position };
  },
  { watch: [slug] },
);

const { data: chromeData } = useAsyncData('service-chrome', async () => {
  return normalizeServiceChrome(await getThemeOptions());
});

const held = shallowRef(data.value ?? null);
watch(
  data,
  (value) => {
    if (value) held.value = value;
  },
  { immediate: true },
);

const service = computed(() => held.value?.service ?? null);
const position = computed(() => held.value?.position);
const chrome = computed(
  () =>
    chromeData.value ?? {
      sectionHeading: null,
      priceFrom: null,
      orderLabel: null,
    },
);
const composition = computed(() =>
  service.value ? getServiceComposition(service.value) : null,
);
const sections = computed(
  () =>
    composition.value?.numbers ?? {
      intro: 0,
      offers: 0,
      next: 0,
    },
);

const ready = computed(
  () => Boolean(data.value?.service) && data.value?.service?.slug === slug.value,
);

const { revealing } = usePageContentReveal();
const titleReady = computed(() => ready.value && revealing.value);

const pageTitle = computed(() => {
  const s = service.value;
  if (!s) return 'Молекула';
  const plainTitle = stripTags(s.title) || s.slug;
  return `${plainTitle} — WebLaba`;
});

const pageDescription = computed(() => {
  const s = service.value;
  return s ? serviceExcerptPlain(s) ?? undefined : undefined;
});

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
});
</script>

<template>
  <ServiceShell
    :service-index="position?.index"
    :sparse="composition?.sparse"
    :revealing="revealing"
  >
    <p v-if="!service && pending" class="case-page__status">Loading…</p>

    <p
      v-else-if="error && !service && (!('statusCode' in error) || error.statusCode !== 404)"
      class="case-page__status"
    >
      Service unavailable.<br />
      Try again later.
    </p>

    <template v-else-if="service">
      <div class="case-grid case-hero case-hero--text">
        <ServiceHeader
          class="case-hero__text"
          :service="service"
          :service-index="position?.index"
          :reveal-ready="titleReady"
        />
      </div>

      <CaseSection
        v-if="sections.intro && service.contentHtml"
        :index="sections.intro"
        label="Intro"
        tone="editorial"
      >
        <div class="case-content__prose" v-html="service.contentHtml" />
      </CaseSection>

      <ServiceOffers
        v-if="sections.offers"
        :service="service"
        :chrome="chrome"
        :section-index="sections.offers"
      />

      <ServiceNavigation
        :section-index="sections.next"
        :prev-slug="position?.prev?.slug ?? null"
        :next-slug="position?.next?.slug ?? null"
        :prev-title="position?.prev?.title ?? null"
        :next-title="position?.next?.title ?? null"
      />
    </template>
  </ServiceShell>
</template>
