<script setup lang="ts">
const { options } = useThemeOptions();
const settings = computed(() => options.value.scrollToTop);
const { visible, enabled, scrollToTop } = useScrollToTopState(settings);

const buttonStyle = computed(() => ({
  '--scroll-top-size': `${settings.value.sizePx}px`,
  '--scroll-top-bg': settings.value.bgColor,
  '--scroll-top-icon': settings.value.iconColor,
  bottom: `${settings.value.offsetBottomPx}px`,
  right:
    settings.value.offsetRightPx != null
      ? `${settings.value.offsetRightPx}px`
      : 'var(--hud-edge-x, 1rem)',
}));
</script>

<template>
  <button
    v-if="enabled"
    type="button"
    class="scroll-to-top"
    :class="{ 'is-visible': visible }"
    :style="buttonStyle"
    aria-label="Scroll to top"
    @click="scrollToTop"
  >
    <span class="scroll-to-top__icon" aria-hidden="true">↑</span>
  </button>
</template>

<style scoped>
.scroll-to-top {
  position: fixed;
  z-index: 90;
  width: var(--scroll-top-size, 48px);
  height: var(--scroll-top-size, 48px);
  border: 0;
  border-radius: 50%;
  background: var(--scroll-top-bg, #92ddb9);
  color: var(--scroll-top-icon, #00160b);
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transform: translateY(0.5rem);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.scroll-to-top.is-visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.scroll-to-top__icon {
  display: block;
  font: 600 1.1rem/1 var(--font-ui, monospace);
}
</style>
