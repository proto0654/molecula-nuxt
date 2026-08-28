<script setup lang="ts">
import type { Case } from '~/types/wp';

const props = defineProps<{
  caseData: Case;
  sectionIndex: number;
}>();

const hasMeta = computed(
  () =>
    Boolean(props.caseData.client) ||
    Boolean(props.caseData.technologies) ||
    Boolean(props.caseData.projectUrl),
);
</script>

<template>
  <section
    v-if="caseData.contentHtml"
    class="case-section case-grid case-content case-section--tone-editorial"
  >
    <CaseSectionMarker
      class="case-zone-label"
      :index="sectionIndex"
      label="Overview"
      tone="editorial"
    />
    <div class="case-content__body">
      <div class="case-content__prose" v-html="caseData.contentHtml" />
    </div>
    <aside v-if="hasMeta" class="case-content__facts">
      <CaseFacts :case-data="caseData" />
    </aside>
  </section>
</template>
