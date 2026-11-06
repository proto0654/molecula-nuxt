<script setup lang="ts">
const spatial = useSpatialState();
const isHome = computed(() => spatial.value.mode === 'home');
const awaitingPose = useAwaitingPose();
const heroStatus = ref<'pending' | 'ready' | 'failed'>('pending');

const pageInert = computed(() => awaitingPose.value && !isHome.value);

useSiteIntegrations();

useHead({
  htmlAttrs: computed(() => ({
    class: isHome.value && heroStatus.value === 'ready' ? 'hero-lock' : '',
  })),
});
</script>

<template>
  <div
    class="app-shell"
    :class="{
      'is-home': isHome,
      'is-awaiting-pose': awaitingPose,
      'has-hero-fallback': heroStatus !== 'ready',
    }"
  >
    <a href="#main" class="skip-link">Перейти к содержимому</a>
    <SiteHeroFallback v-if="heroStatus !== 'ready'" />
    <ClientOnly>
      <MolecularHero @ready="heroStatus = 'ready'" @failed="heroStatus = 'failed'" />
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
    <SiteFooterMenu v-if="!isHome" />
    <SiteFooterLegal v-if="!isHome" />
    <SiteScrollToTop />
  </div>
</template>
