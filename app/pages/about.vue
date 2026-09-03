<script setup lang="ts">
import { aboutExcerptPlain } from '~/domain/about';
import { resolveAboutHeroMedia } from '~/domain/editorialHero';
import { demoteCmsH1 } from '~/domain/wp';
import { stripTags } from '~/domain/portfolio/presentation';

const { page, pending, error } = useAbout();
const { revealing } = usePageContentReveal();

const titlePlain = computed(() => {
  if (!page.value) return 'О нас';
  return stripTags(page.value.title) || 'О нас';
});

const heroMedia = computed(() =>
  page.value ? resolveAboutHeroMedia(page.value.photo, titlePlain.value) : { kind: 'placeholder' as const },
);

const pageDescription = computed(() => {
  if (!page.value) return 'О студии WebLaba';
  return aboutExcerptPlain(page.value) ?? 'О студии WebLaba';
});

const ogImage = computed(() =>
  page.value?.photo?.url ? absoluteMediaUrl(page.value.photo.url) : undefined,
);

const contentHtml = computed(() =>
  page.value?.contentHtml ? demoteCmsH1(page.value.contentHtml) : null,
);

usePageSeo({
  title: titlePlain,
  description: pageDescription,
  ogImage,
});

const indexKicker = useUiString('chrome_index_kicker');
</script>

<template>
  <ArchiveShell :revealing="revealing">
    <p v-if="pending && !page" class="archive-status">Loading…</p>

    <p
      v-else-if="error && !page && (!('statusCode' in error) || error.statusCode !== 404)"
      class="archive-status"
    >
      About unavailable.<br />
      Try again later.
    </p>

    <template v-else-if="page">
      <EditorialHero :media="heroMedia" variant="about" image-variant="about">
        <header class="archive-heading">
          <p class="archive-heading__kicker">{{ indexKicker }}</p>
          <SiteScrambleTitle class="archive-heading__title" :text="titlePlain" />
          <ul v-if="page.tags.length" class="editorial-header__tags">
            <li v-for="tag in page.tags" :key="tag" class="editorial-header__tag">
              {{ tag }}
            </li>
          </ul>
        </header>

        <div
          v-if="contentHtml"
          class="archive-intro case-content__prose"
          v-html="contentHtml"
        />
      </EditorialHero>

      <AboutSkills :page="page" />

      <AboutCta v-if="page.ctaLabel" :label="page.ctaLabel" />
    </template>
  </ArchiveShell>
</template>
