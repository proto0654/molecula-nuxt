<script setup lang="ts">
import { getPage } from '~/api';
import { preferStaticCachedData } from '~/composables/preferStaticCachedData';
import { demoteCmsH1, htmlToPlainText } from '~/domain/wp';
import { stripTags } from '~/domain/portfolio/presentation';
import type { WpPage } from '~/types/wp';

const nuxtApp = useNuxtApp();

const { data: page, pending, error } = useAsyncData(
  'page-privacy-policy',
  () => getPage('privacy-policy'),
  {
    getCachedData(key, app, ctx) {
      return preferStaticCachedData<WpPage | null>(key, app ?? nuxtApp, ctx);
    },
  },
);

const { revealing } = usePageContentReveal();

const titlePlain = computed(() => {
  if (!page.value?.title?.rendered) return null;
  return stripTags(page.value.title.rendered);
});

const pageDescription = computed(() => {
  const excerpt = page.value?.excerpt?.rendered;
  return excerpt ? htmlToPlainText(excerpt) : null;
});

const contentHtml = computed(() =>
  page.value?.content?.rendered ? demoteCmsH1(page.value.content.rendered) : null,
);

usePageSeo({
  title: titlePlain,
  description: pageDescription,
  deferTitle: true,
});

const indexKicker = useUiString('chrome_index_kicker');
</script>

<template>
  <ArchiveShell :revealing="revealing">
    <p v-if="pending && !page" class="archive-status">Loading…</p>

    <p v-else-if="error && !page" class="archive-status">
      Page unavailable.<br />
      Try again later.
    </p>

    <template v-else-if="page && titlePlain">
      <header class="archive-heading">
        <p class="archive-heading__kicker">{{ indexKicker }}</p>
        <SiteScrambleTitle class="archive-heading__title" :text="titlePlain" />
      </header>

      <div
        v-if="contentHtml"
        class="archive-intro case-content__prose"
        v-html="contentHtml"
      />
    </template>
  </ArchiveShell>
</template>
