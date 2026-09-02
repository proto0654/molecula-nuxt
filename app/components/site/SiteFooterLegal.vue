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

.site-footer-legal__line {
  margin: 0 0 0.35rem;
}

.site-footer-legal__line:last-child {
  margin-bottom: 0;
}

.site-footer-legal__line--cookie :deep(a) {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 0.15em;
}
</style>
