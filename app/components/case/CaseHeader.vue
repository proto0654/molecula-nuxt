<script setup lang="ts">
import type { Case } from '~/types/wp';
import { padCaseIndex } from '~/domain/portfolio/presentation';

const props = defineProps<{
  caseData: Case;
  caseIndex?: number | null;
}>();

const hasMeta = computed(
  () =>
    Boolean(props.caseData.client) ||
    Boolean(props.caseData.technologies) ||
    Boolean(props.caseData.projectUrl),
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
    <dl v-if="hasMeta" class="case-header__meta">
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
  </header>
</template>
