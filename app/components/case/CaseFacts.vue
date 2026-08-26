<script setup lang="ts">
import type { Case } from '~/types/wp';

const props = defineProps<{
  caseData: Case;
}>();

const hasMeta = computed(
  () =>
    Boolean(props.caseData.client) ||
    Boolean(props.caseData.technologies) ||
    Boolean(props.caseData.projectUrl),
);
</script>

<template>
  <dl v-if="hasMeta" class="case-facts">
    <div v-if="caseData.client">
      <dt>Client</dt>
      <dd>{{ caseData.client }}</dd>
    </div>
    <div v-if="caseData.technologies">
      <dt>Stack</dt>
      <dd>{{ caseData.technologies }}</dd>
    </div>
    <div v-if="caseData.projectUrl">
      <dt>Url</dt>
      <dd>
        <a
          :href="caseData.projectUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ caseData.projectUrl }}
        </a>
      </dd>
    </div>
  </dl>
</template>
