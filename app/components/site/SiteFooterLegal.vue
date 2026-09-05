<script setup lang="ts">
const { options } = useThemeOptions();

const disclaimer = computed(() => options.value.footer.disclaimer);
const cookieNotice = computed(() => options.value.footer.cookieNotice);
const copyright = computed(() => options.value.footer.copyright);

const hasContent = computed(
  () => Boolean(disclaimer.value || cookieNotice.value || copyright.value),
);
</script>

<template>
  <footer v-if="hasContent" class="site-footer-legal">
    <p v-if="disclaimer" class="site-footer-legal__line">{{ disclaimer }}</p>
    <p
      v-if="cookieNotice"
      class="site-footer-legal__line site-footer-legal__line--cookie"
      v-html="cookieNotice"
    />
    <p v-if="copyright" class="site-footer-legal__line">{{ copyright }}</p>
  </footer>
</template>

<style scoped>
.site-footer-legal {
  position: relative;
  z-index: 2;
  padding: 1rem var(--hud-edge-x, 1rem) 1.25rem;
  font: 300 0.72rem/1.5 var(--font-body, sans-serif);
  color: color-mix(in srgb, var(--wl-text, #e8fff4) 62%, transparent);
}

@media (min-width: 1024px) {
  .site-footer-legal {
    padding: var(--hud-header-inset);
  }
}

.site-footer-legal__line {
  margin: 0 0 0.35rem;
}

.site-footer-legal__line:last-child {
  margin-bottom: 0;
}

.site-footer-legal__line--cookie :deep(a) {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

.site-footer-legal__line--cookie :deep(a:hover) {
  color: var(--color-ink-white);
}
</style>

<!-- Layout-gated entrance — same pattern as SiteFooterMenu (docs/MOTION.md). -->
<style>
html.js-enabled .app-shell.is-awaiting-pose:not(.is-home) .site-footer-legal {
  opacity: 0;
  transform: translate3d(0, var(--enter-y), 0);
  pointer-events: none;
}

html.js-enabled .app-shell:not(.is-home):not(.is-awaiting-pose) .site-footer-legal {
  animation: wl-enter-fade-up var(--enter-duration) var(--enter-ease) both;
  animation-delay: var(--enter-beat-list);
}

@media (prefers-reduced-motion: reduce) {
  html.js-enabled .app-shell.is-awaiting-pose:not(.is-home) .site-footer-legal,
  html.js-enabled .app-shell:not(.is-home):not(.is-awaiting-pose) .site-footer-legal {
    opacity: 1;
    transform: none;
    animation: none;
    pointer-events: auto;
  }
}
</style>
