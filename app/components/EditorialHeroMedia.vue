<script setup lang="ts">
import {
  editorialHeroAboutImageSrc,
  editorialHeroAboutImageSrcSet,
  editorialHeroImageSrc,
  editorialHeroImageSrcSet,
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

const imageSrcSet = computed(() => {
  if (props.media.kind !== 'image') return null;
  return props.imageVariant === 'about'
    ? editorialHeroAboutImageSrcSet(props.media.image)
    : editorialHeroImageSrcSet(props.media.image);
});

const imageSizes = computed(() =>
  props.imageVariant === 'about'
    ? '(min-width: 1024px) 28rem, 85vw'
    : '(min-width: 1024px) min(70vw, 56rem), 100vw',
);
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
          :srcset="imageSrcSet ?? undefined"
          :sizes="imageSrcSet ? imageSizes : undefined"
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
