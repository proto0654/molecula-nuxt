<script setup lang="ts">
const spatial = useSpatialState();
const isHome = computed(() => spatial.value.mode === 'home');
const awaitingPose = useAwaitingPose();

const pageInert = computed(() => awaitingPose.value && !isHome.value);

useSiteIntegrations();

useHead({
  htmlAttrs: computed(() => ({
    class: isHome.value ? 'hero-lock' : '',
  })),
});
</script>

<template>
  <div
    class="app-shell"
    :class="{ 'is-home': isHome, 'is-awaiting-pose': awaitingPose }"
  >
    <a href="#main" class="skip-link">Перейти к содержимому</a>
    <ClientOnly>
      <MolecularHero />
      <template #fallback>
        <div class="molecular-hero-fallback" aria-hidden="true" />
      </template>
    </ClientOnly>
    <main
      id="main"
      class="app-shell__page"
      :inert="pageInert || undefined"
    >
      <slot />
    </main>
    <SiteFooterMenu />
    <SiteFooterLegal />
    <SiteLocaleSwitch />
    <SiteScrollToTop />
  </div>
</template>
