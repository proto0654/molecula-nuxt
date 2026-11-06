<script setup lang="ts">
const { navItems } = useMoleculeHeroNav();
const { locale, localizedPath, alternatePath } = useLocale();
const navigationAria = useUiString('drawer_menu_aria');
const localeAria = useUiString('lang_switch_aria');
const logoAria = useUiString('hero_logo_alt');
const links = computed(() => navItems.value.filter((item) => item.route && item.label));
</script>

<template>
  <header class="hero-fallback">
    <NuxtLink class="hero-fallback__brand" :to="localizedPath('/')" :aria-label="logoAria">
      WebLaba
    </NuxtLink>
    <nav class="hero-fallback__routes" :aria-label="navigationAria">
      <NuxtLink v-for="item in links" :key="item.id" :to="item.route!">
        {{ item.label }}
      </NuxtLink>
    </nav>
    <nav class="hero-fallback__locale" :aria-label="localeAria">
      <NuxtLink :to="alternatePath('ru')" lang="ru" :aria-current="locale === 'ru' ? 'page' : undefined">
        RU
      </NuxtLink>
      <NuxtLink :to="alternatePath('en')" lang="en" :aria-current="locale === 'en' ? 'page' : undefined">
        ENG
      </NuxtLink>
    </nav>
  </header>
</template>

<style scoped>
.hero-fallback {
  position: relative;
  z-index: var(--z-chrome);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.25rem 2rem;
  padding: 1.5rem var(--hud-edge-x, 1.5rem);
  border-bottom: 1px solid var(--wl-line);
  background: var(--wl-bg);
  font: 0.8rem var(--font-ui);
}

.hero-fallback__brand {
  color: var(--color-accent);
  text-transform: uppercase;
}

.hero-fallback__routes {
  display: flex;
  flex: 1 1 20rem;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
}

.hero-fallback__locale {
  display: flex;
  gap: 0.75rem;
}

a:hover,
a[aria-current='page'] {
  color: var(--color-accent);
}
</style>
