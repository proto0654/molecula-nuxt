<script setup lang="ts">
import type { Case } from '~/types/wp';

defineProps<{
  caseData: Case;
}>();
</script>

<template>
  <section v-if="caseData.mobileSlices" class="mb-12">
    <h2 class="mb-4 text-[var(--text-meta)] uppercase tracking-[var(--track-meta)] text-[var(--wl-muted)]">
      Slices
      <span class="ml-2 text-[var(--wl-muted)]">({{ caseData.mobileSlices.ratio }})</span>
    </h2>
    <img
      :src="caseData.mobileSlices.image.sizes['weblaba-screen'] ?? caseData.mobileSlices.image.url"
      :alt="caseData.mobileSlices.image.alt || caseData.title"
      class="max-w-md border border-[var(--wl-line)]"
      loading="lazy"
    />
  </section>
</template>
