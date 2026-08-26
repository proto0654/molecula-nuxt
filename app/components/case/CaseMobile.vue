<script setup lang="ts">
import type { Case } from '~/types/wp';

defineProps<{
  caseData: Case;
}>();
</script>

<template>
  <section v-if="caseData.mobile" class="mb-12">
    <h2 class="mb-4 text-[var(--text-meta)] uppercase tracking-[var(--track-meta)] text-[var(--wl-muted)]">
      Mobile
    </h2>
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
      <img
        :src="caseData.mobile.image.sizes['weblaba-screen'] ?? caseData.mobile.image.url"
        :alt="caseData.mobile.image.alt || caseData.title"
        class="max-w-xs border border-[var(--wl-line)]"
        loading="lazy"
      />
      <div
        v-if="caseData.mobile.captionHtml"
        class="max-w-sm text-sm text-[var(--wl-muted)] [&_a]:text-[var(--wl-accent)]"
        v-html="caseData.mobile.captionHtml"
      />
    </div>
  </section>
</template>
