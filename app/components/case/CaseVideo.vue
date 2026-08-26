<script setup lang="ts">
import type { Case } from '~/types/wp';

defineProps<{
  caseData: Case;
}>();
</script>

<template>
  <section v-if="caseData.video" class="mb-12">
    <h2 class="mb-4 text-[var(--text-meta)] uppercase tracking-[var(--track-meta)] text-[var(--wl-muted)]">
      Video
    </h2>
    <video
      class="w-full max-w-3xl border border-[var(--wl-line)]"
      controls
      preload="metadata"
      :src="caseData.video.url"
    >
      <track kind="captions" />
    </video>
  </section>
</template>
