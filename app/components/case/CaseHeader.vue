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
    <SiteScrambleTitle
      class="case-header__title"
      :text="titlePlain"
      :ready="revealReady"
    />
    <CaseFacts v-if="showMeta" :case-data="caseData" />
  </header>
</template>
