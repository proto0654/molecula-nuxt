<script setup lang="ts">
const route = useRoute();
const { state, clear, isPortfolioPath, isCasePath } = usePortfolioBackdrop();

watch(
  () => route.path,
  (path) => {
    if (!isPortfolioPath(path)) clear();
  },
);

const onCase = computed(() => isCasePath(route.path));
const layerOn = computed(() => onCase.value && Boolean(state.value.url));
const washStyle = computed(() =>
  state.value.url
    ? { backgroundImage: `url(${state.value.url})` }
    : undefined,
);
const rootStyle = computed(() => ({
  '--backdrop-accent': state.value.accent || 'transparent',
}));
</script>

<template>
  <div
    class="portfolio-backdrop"
    :class="{ 'is-on': layerOn, 'has-tint': Boolean(state.accent) }"
    :style="rootStyle"
    aria-hidden="true"
  >
    <div class="portfolio-backdrop__wash" :style="washStyle" />
    <div class="portfolio-backdrop__tint" />
  </div>
</template>
