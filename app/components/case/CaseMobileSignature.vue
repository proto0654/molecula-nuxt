<script setup lang="ts">
import type { Case } from '~/types/wp';

defineProps<{
  caseData: Case;
  sectionIndex: number;
}>();

const root = ref<HTMLElement | null>(null);

useCaseScrollEntry({
  root,
  preset: 'fade',
});
</script>

<template>
  <CaseSection
    v-if="caseData.mobileSignatureHtml"
    :index="sectionIndex"
    label="Mobile"
    tone="editorial"
  >
    <div ref="root" class="case-mobile-signature">
      <span class="case-scroll-trigger" aria-hidden="true" />
      <div
        class="case-mobile-signature__prose case-scroll-motion"
        v-html="caseData.mobileSignatureHtml"
      />
    </div>
  </CaseSection>
</template>
