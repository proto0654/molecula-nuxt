<script setup lang="ts">
import type { Case } from '~/types/wp';
import { padCaseIndex } from '~/domain/portfolio/presentation';

withDefaults(
  defineProps<{
    caseData: Case;
    caseIndex?: number | null;
    showMeta?: boolean;
  }>(),
  { showMeta: true },
);
</script>

<template>
  <header class="case-header">
    <p v-if="caseIndex" class="case-header__index">
      CASE / {{ padCaseIndex(caseIndex) }}
    </p>
    <h1 class="case-header__title" v-html="caseData.title" />
    <p v-if="caseData.titleEn" class="case-header__descriptor">
      {{ caseData.titleEn }}
    </p>
    <div
      v-if="caseData.excerptHtml"
      class="case-header__intro"
      v-html="caseData.excerptHtml"
    />
    <CaseFacts v-if="showMeta" :case-data="caseData" />
  </header>
</template>
