<script setup lang="ts">
import { subscribeCaseTopBand } from '~/composables/useCaseTopScrollBand';

const route = useRoute();
const { state, clear, isPortfolioPath, isCasePath } = usePortfolioBackdrop();
const { washesReady } = usePortfolioWashGate();

watch(
  () => route.path,
  (path) => {
    if (!isPortfolioPath(path)) clear();
  },
);

const onCase = computed(() => isCasePath(route.path));
const layerOn = computed(
  () => onCase.value && washesReady.value && Boolean(state.value.url),
);
const atTop = ref(true);

let bandUnsub: (() => void) | null = null;

watch(
  onCase,
  (isCase) => {
    bandUnsub?.();
    bandUnsub = null;
    if (isCase) {
      bandUnsub = subscribeCaseTopBand((next) => {
        atTop.value = next;
      });
    } else {
      atTop.value = true;
    }
  },
  { immediate: true },
);

onScopeDispose(() => {
  bandUnsub?.();
});

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
    :class="{
      'is-on': layerOn,
      'is-at-top': atTop,
      'has-tint': Boolean(state.accent),
    }"
    :style="rootStyle"
    aria-hidden="true"
  >
    <div class="portfolio-backdrop__wash" :style="washStyle" />
    <div class="portfolio-backdrop__tint" />
  </div>
</template>
