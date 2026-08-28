<script setup lang="ts">
import type { Case } from '~/types/wp';

defineProps<{
  caseData: Case;
  sectionIndex: number;
}>();
</script>

<template>
  <CaseSection
    v-if="caseData.mobileSignatureHtml"
    :index="sectionIndex"
    label="Mobile"
    tone="editorial"
  >
    <div class="case-mobile-signature">
      <div
        class="case-mobile-signature__prose"
        v-html="caseData.mobileSignatureHtml"
      />
    </div>
  </CaseSection>
</template>
