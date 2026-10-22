<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { disposeHairlineDust } from '~/lib/motion/hairlineDust';

const layer = ref<HTMLElement | null>(null);

onBeforeUnmount(() => {
  if (layer.value) disposeHairlineDust(layer.value);
});
</script>

<template>
  <div ref="layer" class="hairline-dust" aria-hidden="true" />
</template>
