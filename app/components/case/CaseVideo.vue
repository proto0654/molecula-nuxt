<script setup lang="ts">
import type { CaseVideo as CaseVideoType } from '~/types/wp';

defineProps<{
  video: CaseVideoType;
}>();
</script>

<template>
  <video
    class="editorial-hero-media__el"
    controls
    preload="metadata"
    :src="video.url"
    :width="video.width ?? undefined"
    :height="video.height ?? undefined"
  >
    <track kind="captions" />
  </video>
</template>
