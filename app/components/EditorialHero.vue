<script setup lang="ts">
import {
  editorialHeroFrameAspectRatio,
  type EditorialHeroMedia,
  type EditorialHeroVariant,
} from '~/domain/editorialHero';

const props = withDefaults(
  defineProps<{
    media: EditorialHeroMedia;
    imageVariant?: 'screen' | 'about';
    variant?: EditorialHeroVariant;
  }>(),
  {
    imageVariant: 'screen',
    variant: 'archive',
  },
);

const frameAspectRatio = computed(() =>
  editorialHeroFrameAspectRatio(props.media, props.variant),
);

const bleedMobile = computed(() => props.variant !== 'about');
</script>

<template>
  <div
    class="editorial-hero"
    :class="[
      `editorial-hero--${variant}`,
      { 'editorial-hero--bleed-mobile': bleedMobile },
    ]"
  >
    <div class="editorial-hero__content">
      <slot />
    </div>
    <div class="editorial-hero__aside">
      <EditorialHeroMedia
        :media="media"
        :image-variant="imageVariant"
        :aspect-ratio="frameAspectRatio"
      />
    </div>
  </div>
</template>
