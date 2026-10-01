<script setup lang="ts">
import {
  editorialHeroImageSrc,
  editorialHeroImageSrcSet,
} from '~/domain/editorialHero';
import type { CaseImage, CaseVideo as CaseVideoType } from '~/types/wp';

const props = defineProps<{
  video: CaseVideoType;
  /** Featured (or other) still shown while the mp4 buffers or on error. */
  poster?: CaseImage | null;
}>();

const posterSrc = computed(() =>
  props.poster ? editorialHeroImageSrc(props.poster) : null,
);

const posterSrcSet = computed(() =>
  props.poster ? editorialHeroImageSrcSet(props.poster) : null,
);
</script>

<template>
  <div data-case-video-shell class="case-video-shell">
    <span class="case-video-shell__skeleton" aria-hidden="true" />
    <img
      v-if="posterSrc"
      class="case-video-shell__poster"
      :src="posterSrc"
      :srcset="posterSrcSet ?? undefined"
      sizes="(min-width: 1024px) min(50vw, 36rem), 100vw"
      alt=""
      :width="poster?.width ?? undefined"
      :height="poster?.height ?? undefined"
      loading="eager"
      decoding="async"
      aria-hidden="true"
    />
    <video
      data-case-video
      class="editorial-hero-media__el case-video-shell__el"
      controls
      playsinline
      muted
      preload="none"
      :poster="posterSrc ?? undefined"
      :src="video.url"
      :width="video.width ?? undefined"
      :height="video.height ?? undefined"
    />
  </div>
</template>
