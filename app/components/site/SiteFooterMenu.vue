<script setup lang="ts">
/**
 * WP menus/v1 consumer for footer chrome.
 * Does not drive molecular hero nav (that stays NAV_STRUCTURE + page hero_*).
 * Hidden on /contact — contacts page already lists social channels.
 */
import { menuItemHref, menuItemIsExternal } from '~/domain/menus';
import { stripLocalePrefix } from '~/domain/i18n';

const route = useRoute();
const { menu } = useWpMenu('social');

const items = computed(() =>
  (menu.value?.items ?? []).filter((item) => item.title && item.url),
);

const isContact = computed(() => stripLocalePrefix(route.path) === '/contact');

const hasItems = computed(() => items.value.length > 0 && !isContact.value);
</script>

<template>
  <nav v-if="hasItems" class="site-footer-menu" aria-label="Соцсети">
    <ul class="site-footer-menu__list">
      <li v-for="item in items" :key="item.id" class="site-footer-menu__item">
        <a
          v-if="menuItemIsExternal(item)"
          class="site-footer-menu__link"
          :href="menuItemHref(item)"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ item.title }}
        </a>
        <NuxtLink
          v-else
          class="site-footer-menu__link"
          :to="menuItemHref(item)"
        >
          {{ item.title }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.site-footer-menu {
  position: relative;
  z-index: 2;
  padding: 0 var(--hud-edge-x, 1rem) 0.65rem;
}

@media (min-width: 1024px) {
  .site-footer-menu {
    padding-left: var(--hud-header-inset);
    padding-right: var(--hud-header-inset);
  }
}

.site-footer-menu__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem 1.1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.site-footer-menu__link {
  font: 300 0.72rem/1.4 var(--font-body, sans-serif);
  color: color-mix(in srgb, var(--wl-text, #e8fff4) 72%, transparent);
  text-decoration: none;
  text-underline-offset: 0.15em;
}

.site-footer-menu__link:hover {
  color: var(--wl-text, #e8fff4);
  text-decoration: underline;
}
</style>

<!-- Layout-gated entrance — same tokens as archive/case tails (docs/MOTION.md). -->
<style>
html.js-enabled .app-shell.is-awaiting-pose:not(.is-home) .site-footer-menu {
  opacity: 0;
  transform: translate3d(0, var(--enter-y), 0);
  pointer-events: none;
}

html.js-enabled .app-shell:not(.is-home):not(.is-awaiting-pose) .site-footer-menu {
  animation: wl-enter-fade-up var(--enter-duration) var(--enter-ease) both;
  animation-delay: var(--enter-beat-list);
}

@media (prefers-reduced-motion: reduce) {
  html.js-enabled .app-shell.is-awaiting-pose:not(.is-home) .site-footer-menu,
  html.js-enabled .app-shell:not(.is-home):not(.is-awaiting-pose) .site-footer-menu {
    opacity: 1;
    transform: none;
    animation: none;
    pointer-events: auto;
  }
}
</style>
