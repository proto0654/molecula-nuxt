<script setup lang="ts">
import type { Case } from '~/types/wp';

defineProps<{
  caseData: Case;
  sectionIndex: number;
}>();
</script>

<template>
  <CaseSection v-if="caseData.contentHtml" :index="sectionIndex" label="Content">
    <div class="prose-wp" v-html="caseData.contentHtml" />
  </CaseSection>
</template>
