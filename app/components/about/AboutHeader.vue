<script setup lang="ts">
import type { AboutPage } from '~/types/wp';
import { stripTags } from '~/domain/portfolio/presentation';

const props = withDefaults(
  defineProps<{
    page: AboutPage;
    revealReady?: boolean;
  }>(),
  { revealReady: true },
);

const titlePlain = computed(() => stripTags(props.page.title));
</script>

<template>
  <header class="case-header about-header">
    <SiteScrambleTitle
      class="case-header__title"
      :text="titlePlain"
      :ready="revealReady"
    />
    <ul v-if="page.tags.length" class="editorial-header__tags">
      <li v-for="tag in page.tags" :key="tag" class="editorial-header__tag">
        {{ tag }}
      </li>
    </ul>
  </header>
</template>
