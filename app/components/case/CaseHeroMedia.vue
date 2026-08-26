<script setup lang="ts">
import type { Case } from '~/types/wp';
import type { CaseHeroKind } from '~/domain/portfolio/presentation';
import { caseHeroAlt, caseHeroImageUrl } from '~/domain/portfolio/presentation';

const props = defineProps<{
  caseData: Case;
  kind: CaseHeroKind;
}>();

const imageUrl = computed(() => caseHeroImageUrl(props.caseData, props.kind));
const alt = computed(() => caseHeroAlt(props.caseData, props.kind));
const cover = computed(() => props.kind === 'featured');
</script>

<template>
  <div v-if="kind === 'video' ? caseData.video : imageUrl" class="case-media">
    <div class="case-media__frame">
      <CaseVideo v-if="kind === 'video' && caseData.video" :video="caseData.video" />
      <img
        v-else-if="imageUrl"
        class="case-media__el"
        :class="{ 'case-media__el--cover': cover }"
        :src="imageUrl"
        :alt="alt"
        loading="eager"
      />
    </div>
  </div>
</template>
