<script setup lang="ts">
import type { Case } from '~/types/wp';
import { padCaseIndex, stripTags } from '~/domain/portfolio/presentation';

const props = withDefaults(
  defineProps<{
    caseData: Case;
    caseIndex?: number | null;
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
    <p v-if="caseIndex" class="case-header__index">
      CASE / {{ padCaseIndex(caseIndex) }}
    </p>
    <SiteScrambleTitle
      class="case-header__title"
      :text="titlePlain"
      :ready="revealReady"
    />
    <div
      v-if="caseData.excerptHtml"
      class="case-header__intro"
      v-html="caseData.excerptHtml"
    />
    <CaseFacts v-if="showMeta" :case-data="caseData" />
  </header>
</template>
