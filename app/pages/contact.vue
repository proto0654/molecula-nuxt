<script setup lang="ts">
import { contactExcerptPlain, getContactComposition } from '~/domain/contacts';

const { page, pending, error } = useContacts();
const { revealing } = usePageContentReveal();

const composition = computed(() =>
  page.value ? getContactComposition(page.value) : null,
);
const sections = computed(
  () =>
    composition.value?.numbers ?? {
      intro: 0,
      links: 0,
    },
);

const titleReady = computed(() => Boolean(page.value) && revealing.value);

const pageDescription = computed(() => {
  if (!page.value) return 'Контакты WebLaba';
  return contactExcerptPlain(page.value) ?? 'Контакты WebLaba';
});

useSeoMeta({
  title: 'Контакты — WebLaba',
  description: pageDescription,
});
</script>

<template>
  <ContactShell :sparse="composition?.sparse" :revealing="revealing">
    <p v-if="pending && !page" class="case-page__status">Loading…</p>

    <p v-else-if="error && !page" class="case-page__status">
      Contacts unavailable.<br />
      Try again later.
    </p>

    <template v-else-if="page">
      <div class="case-grid case-hero case-hero--text">
        <ContactHeader
          class="case-hero__text"
          :reveal-ready="titleReady"
        />
      </div>

      <CaseSection
        v-if="sections.intro && page.text"
        :index="sections.intro"
        label="Intro"
        tone="editorial"
      >
        <p class="case-content__prose">{{ page.text }}</p>
      </CaseSection>

      <ContactLinks
        v-if="sections.links"
        :page="page"
        :section-index="sections.links"
      />
    </template>
  </ContactShell>
</template>
