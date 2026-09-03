<script setup lang="ts">
import type { Case } from '~/types/wp';
import { stripTags } from '~/domain/portfolio/presentation';

const props = withDefaults(
  defineProps<{
    caseData: Case;
    showMeta?: boolean;
    /** False while case body exits / waits for pose-chained enter. */
    revealReady?: boolean;
  }>(),
  { showMeta: true, revealReady: true },
);

const titlePlain = computed(() => stripTags(props.caseData.title));
</script>

<template>
  <header class="case-header">
    <ul v-if="caseData.tags.length" class="editorial-header__tags case-header__tags">
      <li v-for="tag in caseData.tags" :key="tag" class="editorial-header__tag">
        {{ tag }}
      </li>
    </ul>
    <SiteScrambleTitle
      class="case-header__title"
      :text="titlePlain"
      :ready="revealReady"
    />
    <CaseFacts v-if="showMeta" :case-data="caseData" />
  </header>
</template>
