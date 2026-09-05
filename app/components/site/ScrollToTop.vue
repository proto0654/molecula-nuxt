<script setup lang="ts">
const { options } = useThemeOptions();
const settings = computed(() => options.value.scrollToTop);
const { visible, enabled, scrollToTop } = useScrollToTopState(settings);
</script>

<template>
  <button
    v-if="enabled"
    type="button"
    class="scroll-to-top"
    :class="{ 'is-visible': visible }"
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
  bottom: var(--hud-scroll-inset-bottom);
  right: var(--hud-scroll-inset-right);
  width: 2.25rem;
  height: 2.25rem;
  display: grid;
  place-items: center;
  border: 1px solid var(--color-accent);
  border-radius: 0;
  background: transparent;
  color: var(--color-accent);
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transform: translateY(0.5rem);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

@media (max-width: 767px) {
  .scroll-to-top {
    width: 2rem;
    height: 2rem;
  }

  .scroll-to-top__icon {
    font-size: 0.8125rem;
  }
}

.scroll-to-top.is-visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.scroll-to-top:hover,
.scroll-to-top:focus-visible {
  color: var(--color-ink-white);
  border-color: var(--color-ink-white);
}

.scroll-to-top:focus-visible {
  outline: 1px solid var(--color-ink-white);
  outline-offset: 2px;
}

.scroll-to-top__icon {
  display: block;
  font: 400 0.875rem/1 var(--font-ui, monospace);
  letter-spacing: 0;
}
</style>
