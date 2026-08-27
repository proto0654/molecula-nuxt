<script setup lang="ts">
import { aboutExcerptPlain, getAboutComposition } from '~/domain/about';
import { stripTags } from '~/domain/portfolio/presentation';

const { page, pending, error } = useAbout();
const { revealing } = usePageContentReveal();

const titlePlain = computed(() => {
  if (!page.value) return 'О нас';
  return stripTags(page.value.title) || 'О нас';
});

const composition = computed(() =>
  page.value ? getAboutComposition(page.value) : null,
);
const sections = computed(
  () =>
    composition.value?.numbers ?? {
      intro: 0,
      skills: 0,
      cta: 0,
    },
);

const titleReady = computed(() => Boolean(page.value) && revealing.value);

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
  <AboutShell :sparse="composition?.sparse" :revealing="revealing">
    <p v-if="pending && !page" class="case-page__status">Loading…</p>

    <p
      v-else-if="error && !page && (!('statusCode' in error) || error.statusCode !== 404)"
      class="case-page__status"
    >
      About unavailable.<br />
      Try again later.
    </p>

    <template v-else-if="page">
      <div class="case-grid case-hero about-hero">
        <AboutPhoto
          v-if="page.photo"
          class="about-hero__photo case-zone-label"
          :photo="page.photo"
          :alt="titlePlain"
        />
        <AboutHeader
          class="about-hero__text case-zone-body"
          :page="page"
          :reveal-ready="titleReady"
        />
      </div>

      <CaseSection
        v-if="sections.intro && page.contentHtml"
        :index="sections.intro"
        label="Intro"
        tone="editorial"
      >
        <div class="case-content__prose" v-html="page.contentHtml" />
      </CaseSection>

      <AboutSkills
        v-if="sections.skills"
        :page="page"
        :section-index="sections.skills"
      />

      <AboutCta
        v-if="sections.cta && page.ctaLabel"
        :label="page.ctaLabel"
        :section-index="sections.cta"
      />
    </template>
  </AboutShell>
</template>
