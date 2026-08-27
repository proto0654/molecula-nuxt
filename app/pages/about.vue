<script setup lang="ts">
import { aboutExcerptPlain } from '~/domain/about';
import { stripTags } from '~/domain/portfolio/presentation';

const { page, pending, error } = useAbout();
const { revealing } = usePageContentReveal();

const titlePlain = computed(() => {
  if (!page.value) return 'О нас';
  return stripTags(page.value.title) || 'О нас';
});

const pageTitle = computed(() => `${titlePlain.value} — WebLaba`);
const pageDescription = computed(() => {
  if (!page.value) return 'О студии WebLaba';
  return aboutExcerptPlain(page.value) ?? 'О студии WebLaba';
});

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
});
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
      <header class="archive-heading">
        <p class="archive-heading__kicker">Index</p>
        <SiteScrambleTitle class="archive-heading__title" :text="titlePlain" />
        <ul v-if="page.tags.length" class="editorial-header__tags">
          <li v-for="tag in page.tags" :key="tag" class="editorial-header__tag">
            {{ tag }}
          </li>
        </ul>
      </header>

      <AboutPhoto
        v-if="page.photo"
        class="about-photo"
        :photo="page.photo"
        :alt="titlePlain"
      />

      <div
        v-if="page.contentHtml"
        class="archive-intro case-content__prose"
        v-html="page.contentHtml"
      />

      <AboutSkills :page="page" />

      <AboutCta v-if="page.ctaLabel" :label="page.ctaLabel" />
    </template>
  </ArchiveShell>
</template>
