<script setup lang="ts">
import type { Case } from '~/types/wp';
import type { CaseHeroKind } from '~/domain/portfolio/presentation';

defineProps<{
  caseData: Case;
  kind: CaseHeroKind;
}>();
</script>

<template>
  <div
    v-if="kind === 'video' && caseData.video"
    class="case-media case-media--video"
  >
    <div class="case-media__frame">
      <CaseVideo :video="caseData.video" />
    </div>
  </div>
</template>
