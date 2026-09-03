<script setup lang="ts">
import { getServiceBySlug, getServiceSlimIndex } from '~/api';
import { getServicePosition } from '~/domain/services/adjacent';
import { resolveAdjacentFlipDirection } from '~/composables/useCasePageTransition';
import {
  normalizeServiceChrome,
  normalizeServicePost,
  serviceExcerptPlain,
} from '~/domain/services';
import { resolveServiceHeroMedia } from '~/domain/editorialHero';
import { demoteCmsH1 } from '~/domain/wp';
import { stripTags } from '~/domain/portfolio/presentation';

const route = useRoute();
const slug = computed(() => String(route.params.slug || ''));

const { data: serviceSlimIndex } = useAsyncData(
  'service-slim-index',
  () => getServiceSlimIndex(),
);

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
    const slim = serviceSlimIndex.value ?? (await getServiceSlimIndex());
    const position = getServicePosition(slug.value, slim);
    return { service, position };
  },
  { watch: [slug] },
);

const { acf: themeAcf } = useThemeOptionsAcfData();

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
const backToArchiveLabel = useUiString('services_back_to_archive');
const chrome = computed(() => normalizeServiceChrome(themeAcf.value));

/** NEXT footer uses case-style marker; offers are list rows, not numbered case sections. */
const navSectionIndex = 1;

const ready = computed(
  () => Boolean(data.value?.service) && data.value?.service?.slug === slug.value,
);

const { bodyClass, contentRevealReady } = useCasePageTransition({
  accentColor: () => null,
  ready,
  resolveFlipDirection: (fromSlug, toSlug) =>
    resolveAdjacentFlipDirection(fromSlug, toSlug, (from) =>
      getServicePosition(from, serviceSlimIndex.value ?? []),
    ),
});

const awaitingPose = useAwaitingPose();

provideCaseMotionGate(
  computed(
    () => contentRevealReady.value && !awaitingPose.value,
  ),
);

const { revealing } = usePageContentReveal();

const titlePlain = computed(() => {
  if (!service.value) return '';
  return stripTags(service.value.title) || service.value.slug;
});

const pageTitle = computed(() => titlePlain.value || null);

const pageDescription = computed(() => {
  const s = service.value;
  if (!s) return undefined;
  return (
    serviceExcerptPlain(s) ??
    (titlePlain.value ? `Услуга «${titlePlain.value}» — WebLaba` : undefined)
  );
});

const ogImage = computed(() =>
  service.value?.featuredImage?.url
    ? absoluteMediaUrl(service.value.featuredImage.url)
    : undefined,
);

const introHtml = computed(() =>
  service.value?.contentHtml ? demoteCmsH1(service.value.contentHtml) : null,
);

const heroMedia = computed(() =>
  service.value
    ? resolveServiceHeroMedia(service.value.featuredImage, titlePlain.value)
    : { kind: 'placeholder' as const },
);

usePageSeo({
  title: pageTitle,
  description: pageDescription,
  ogImage,
  deferTitle: true,
  ogType: 'article',
});
</script>

<template>
  <ArchiveShell
    :revealing="revealing && contentRevealReady"
    :detail-index="position?.index"
    detail-variant="service"
    archive-scope="services"
    :body-class="bodyClass"
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
          <SiteScrambleTitle class="archive-heading__title" :text="titlePlain" />
          <ul v-if="service.tags.length" class="editorial-header__tags">
            <li v-for="tag in service.tags" :key="tag" class="editorial-header__tag">
              {{ tag }}
            </li>
          </ul>
        </header>

        <div
          v-if="introHtml"
          class="archive-intro case-content__prose"
          v-html="introHtml"
        />
      </EditorialHero>

      <ServiceOffers :service="service" :chrome="chrome" />

      <ArchiveDetailNav
        :section-index="navSectionIndex"
        :prev-slug="position?.prev?.slug ?? null"
        :next-slug="position?.next?.slug ?? null"
        :prev-title="position?.prev?.title ?? null"
        :next-title="position?.next?.title ?? null"
        base-path="/services"
        :index-label="backToArchiveLabel"
        archive-scope="services"
        aria-label="Навигация по услугам"
      />
    </template>
  </ArchiveShell>
</template>
