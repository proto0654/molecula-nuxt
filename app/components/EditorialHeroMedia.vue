<script setup lang="ts">
import {
  editorialHeroAboutImageSrc,
  editorialHeroImageSrc,
  type EditorialHeroMedia,
} from '~/domain/editorialHero';

const props = defineProps<{
  media: EditorialHeroMedia;
  aspectRatio: string;
  /** About portrait uses landing sizes; default screen sizes elsewhere. */
  imageVariant?: 'screen' | 'about';
}>();

const imageSrc = computed(() => {
  if (props.media.kind !== 'image') return null;
  return props.imageVariant === 'about'
    ? editorialHeroAboutImageSrc(props.media.image)
    : editorialHeroImageSrc(props.media.image);
});
</script>

<template>
  <div class="editorial-hero-media">
    <div
      class="editorial-hero-media__frame"
      :class="{ 'editorial-hero-media__frame--placeholder': media.kind === 'placeholder' }"
      :style="{ aspectRatio }"
    >
      <span class="editorial-hero-media__edge editorial-hero-media__edge--top" aria-hidden="true" />
      <span
        class="editorial-hero-media__edge editorial-hero-media__edge--right"
        aria-hidden="true"
      />
      <span
        class="editorial-hero-media__edge editorial-hero-media__edge--bottom"
        aria-hidden="true"
      />
      <span class="editorial-hero-media__edge editorial-hero-media__edge--left" aria-hidden="true" />

      <div class="editorial-hero-media__fill">
        <CaseVideo
          v-if="media.kind === 'video'"
          class="editorial-hero-media__video"
          :video="media.video"
        />
        <img
          v-else-if="media.kind === 'image' && imageSrc"
          class="editorial-hero-media__img"
          :src="imageSrc"
          :alt="media.alt"
          :width="media.image.width ?? undefined"
          :height="media.image.height ?? undefined"
          loading="eager"
          decoding="async"
        />
      </div>
    </div>
  </div>
</template>
