<script setup lang="ts">
import type { Case } from '~/types/wp';
import { caseImageUrl } from '~/domain/portfolio/presentation';

defineProps<{
  caseData: Case;
  sectionIndex: number;
}>();
</script>

<template>
  <CaseSection v-if="caseData.mobile" :index="sectionIndex" label="Mobile">
    <div class="case-mobile">
      <figure class="case-mobile__figure">
        <img
          :src="caseImageUrl(caseData.mobile.image)"
          :alt="caseData.mobile.image.alt || caseData.title"
          loading="lazy"
        />
      </figure>
      <div
        v-if="caseData.mobile.captionHtml"
        class="case-mobile__caption"
        v-html="caseData.mobile.captionHtml"
      />
    </div>
  </CaseSection>
</template>
