<script setup lang="ts">
import type { CaseVideo as CaseVideoType } from '~/types/wp';

defineProps<{
  video: CaseVideoType;
}>();
</script>

<template>
  <video class="case-media__el" controls preload="metadata" :src="video.url">
    <track kind="captions" />
  </video>
</template>
