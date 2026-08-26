<script setup lang="ts">
import type { Case } from '~/types/wp';
import { caseImageUrl } from '~/domain/portfolio/presentation';

defineProps<{
  caseData: Case;
  sectionIndex: number;
}>();
</script>

<template>
  <CaseSection v-if="caseData.mobileSlices" :index="sectionIndex" label="Slices">
    <div class="case-slices__visual">
      <img
        class="case-slices__img"
        :src="caseImageUrl(caseData.mobileSlices.image)"
        :alt="caseData.mobileSlices.image.alt || caseData.title"
        loading="lazy"
      />
      <p class="case-slices__ratio">{{ caseData.mobileSlices.ratio }}</p>
    </div>
  </CaseSection>
</template>
