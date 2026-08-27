<script setup lang="ts">
const spatial = useSpatialState();
const isHome = computed(() => spatial.value.mode === 'home');
const awaitingPose = useAwaitingPose();

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
    <ClientOnly>
      <MolecularHero />
      <template #fallback>
        <div class="molecular-hero-fallback" aria-hidden="true" />
      </template>
    </ClientOnly>
    <ClientOnly>
      <PortfolioBackdrop />
    </ClientOnly>
    <div class="app-shell__page">
      <slot />
    </div>
  </div>
</template>
