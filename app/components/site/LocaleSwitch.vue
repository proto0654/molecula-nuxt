<script setup lang="ts">
const { locale, alternatePath } = useLocale();
const ariaLabel = useUiString('lang_switch_aria');

const targetPath = computed(() => alternatePath());
const targetLocale = computed(() => (locale.value === 'en' ? 'ru' : 'en'));
const label = computed(() => (targetLocale.value === 'en' ? 'EN' : 'RU'));
</script>

<template>
  <NuxtLink
    :to="targetPath"
    class="locale-switch"
    :aria-label="ariaLabel"
    :lang="targetLocale"
  >
    {{ label }}
  </NuxtLink>
</template>

<style scoped>
.locale-switch {
  position: fixed;
  right: var(--hud-header-inset, 1.25rem);
  bottom: calc(var(--hud-header-inset, 1.25rem) + 3.5rem);
  z-index: 40;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  min-height: 2.5rem;
  padding: 0 0.5rem;
  font-family: var(--font-ui);
  font-size: 0.6875rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--wl-fg, #00160b);
  background: color-mix(in srgb, var(--wl-bg, #f5f5f0) 88%, transparent);
  border: 1px solid var(--wl-line, rgba(0, 22, 11, 0.2));
  backdrop-filter: blur(6px);
}

.locale-switch:hover {
  border-color: var(--wl-accent, #92ddb9);
}
</style>
