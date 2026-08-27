<script setup lang="ts">
import type { CaseImage } from '~/types/wp';
import { caseImageUrl, CASE_LANDING_SIZES } from '~/domain/portfolio/presentation';

const props = defineProps<{
  photo: CaseImage;
  alt: string;
}>();

const src = computed(() => caseImageUrl(props.photo, CASE_LANDING_SIZES));
</script>

<template>
  <figure class="about-photo">
    <img
      :src="src"
      :alt="photo.alt || alt"
      :width="photo.width ?? undefined"
      :height="photo.height ?? undefined"
      loading="eager"
      decoding="async"
    />
  </figure>
</template>
