<script setup lang="ts">
import { getServiceBySlug, getServiceSlimIndex, getThemeOptions } from '~/api';
import { getServicePosition } from '~/domain/services/adjacent';
import {
  normalizeServiceChrome,
  normalizeServicePost,
  serviceExcerptPlain,
} from '~/domain/services';
import { resolveServiceHeroMedia } from '~/domain/editorialHero';
import { padCaseIndex, stripTags } from '~/domain/portfolio/presentation';

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

const ready = computed(
  () => Boolean(data.value?.service) && data.value?.service?.slug === slug.value,
);

const { revealing } = usePageContentReveal();

const titlePlain = computed(() => {
  if (!service.value) return '';
  return stripTags(service.value.title) || service.value.slug;
});

const pageTitle = computed(() => {
  if (!service.value) return 'Молекула';
  return `${titlePlain.value} — WebLaba`;
});

const pageDescription = computed(() => {
  const s = service.value;
  return s ? serviceExcerptPlain(s) ?? undefined : undefined;
});

const heroMedia = computed(() =>
  service.value ? resolveServiceHeroMedia(null, '') : { kind: 'placeholder' as const },
);

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
});
</script>

<template>
  <ArchiveShell
    :revealing="revealing && ready"
    :detail-index="position?.index"
    detail-variant="service"
    archive-scope="services"
  >
    <p v-if="!service && pending" class="archive-status">Loading…</p>

    <p
      v-else-if="error && !service && (!('statusCode' in error) || error.statusCode !== 404)"
      class="archive-status"
    >
      Service unavailable.<br />
      Try again later.
    </p>

    <template v-else-if="service">
      <EditorialHero :media="heroMedia">
        <header class="archive-heading">
          <p v-if="position?.index" class="archive-heading__kicker">
            Service / {{ padCaseIndex(position.index) }}
          </p>
          <SiteScrambleTitle class="archive-heading__title" :text="titlePlain" />
          <ul v-if="service.tags.length" class="editorial-header__tags">
            <li v-for="tag in service.tags" :key="tag" class="editorial-header__tag">
              {{ tag }}
            </li>
          </ul>
        </header>

        <div
          v-if="service.contentHtml"
          class="archive-intro case-content__prose"
          v-html="service.contentHtml"
        />
      </EditorialHero>

      <ServiceOffers :service="service" :chrome="chrome" />

      <ArchiveDetailNav
        :prev-slug="position?.prev?.slug ?? null"
        :next-slug="position?.next?.slug ?? null"
        :prev-title="position?.prev?.title ?? null"
        :next-title="position?.next?.title ?? null"
        base-path="/services"
        index-label="Back to services"
        archive-scope="services"
        aria-label="Service navigation"
      />
    </template>
  </ArchiveShell>
</template>
