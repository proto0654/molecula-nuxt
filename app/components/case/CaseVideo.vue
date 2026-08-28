<script setup lang="ts">
import type { CaseVideo as CaseVideoType } from '~/types/wp';

defineProps<{
  video: CaseVideoType;
}>();
</script>

<template>
  <div data-case-video-shell class="case-video-shell">
    <span class="case-video-shell__skeleton" aria-hidden="true" />
    <video
      data-case-video
      class="editorial-hero-media__el case-video-shell__el"
      controls
      playsinline
      muted
      preload="none"
      :src="video.url"
      :width="video.width ?? undefined"
      :height="video.height ?? undefined"
    />
  </div>
</template>
