<script setup lang="ts">
import type { Case } from '~/types/wp';
import { wrapCaseListItemBodies } from '~/domain/wp';

const props = defineProps<{
  caseData: Case;
  sectionIndex: number;
}>();

const mobileLabel = useUiString('case_section_mobile');

const signatureHtml = computed(() =>
  props.caseData.mobileSignatureHtml
    ? wrapCaseListItemBodies(props.caseData.mobileSignatureHtml)
    : null,
);
</script>

<template>
  <CaseSection
    v-if="signatureHtml"
    :index="sectionIndex"
    :label="mobileLabel"
    tone="editorial"
  >
    <div class="case-mobile-signature">
      <div
        class="case-mobile-signature__prose"
        v-html="signatureHtml"
      />
    </div>
  </CaseSection>
</template>
