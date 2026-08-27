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
  <SectionShell meta="ABOUT" :revealing="revealing">
    <p v-if="pending && !page" class="archive-status">Loading…</p>

    <p
      v-else-if="error && !page && (!('statusCode' in error) || error.statusCode !== 404)"
      class="archive-status"
    >
      About unavailable.<br />
      Try again later.
    </p>

    <article v-else-if="page" class="about-page">
      <div v-if="page.photo || page.tags.length" class="about-hero">
        <AboutPhoto
          v-if="page.photo"
          :photo="page.photo"
          :alt="titlePlain"
        />
        <ul v-if="page.tags.length" class="about-hero__tags">
          <li v-for="tag in page.tags" :key="tag" class="about-hero__tag">
            {{ tag }}
          </li>
        </ul>
      </div>

      <header class="archive-heading about-heading">
        <p class="archive-heading__kicker">Section</p>
        <SiteScrambleTitle class="archive-heading__title" :text="titlePlain" />
      </header>

      <div
        v-if="page.contentHtml"
        class="about-intro case-content__prose"
        v-html="page.contentHtml"
      />

      <AboutSkills :page="page" />

      <AboutCta v-if="page.ctaLabel" :label="page.ctaLabel" />
    </article>
  </SectionShell>
</template>
