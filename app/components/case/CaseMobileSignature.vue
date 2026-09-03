<script setup lang="ts">
import type { Case } from '~/types/wp';

defineProps<{
  caseData: Case;
  sectionIndex: number;
}>();

const mobileLabel = useUiString('case_section_mobile');
</script>

<template>
  <CaseSection
    v-if="caseData.mobileSignatureHtml"
    :index="sectionIndex"
    :label="mobileLabel"
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
