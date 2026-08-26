<script setup lang="ts">
import type { Case } from '~/types/wp';

defineProps<{
  caseData: Case;
}>();
</script>

<template>
  <section v-if="caseData.contentHtml" class="case-content mb-12 max-w-3xl text-sm leading-relaxed text-[var(--wl-text)]">
    <h2 class="mb-4 text-[var(--text-meta)] uppercase tracking-[var(--track-meta)] text-[var(--wl-muted)]">
      Content
    </h2>
    <div class="prose-wp space-y-3 [&_a]:text-[var(--wl-accent)] [&_a]:underline" v-html="caseData.contentHtml" />
  </section>
</template>
