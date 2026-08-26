<script setup lang="ts">
useHead({
  title: 'Молекула',
  htmlAttrs: { lang: 'ru', class: 'hero-lock' },
});

onMounted(() => {
  document.documentElement.classList.add('hero-lock');
});

onBeforeUnmount(() => {
  document.documentElement.classList.remove('hero-lock');
});
</script>

<template>
  <ClientOnly>
    <MolecularHero />
    <template #fallback>
      <div class="molecular-hero-fallback" aria-busy="true">Loading…</div>
    </template>
  </ClientOnly>
</template>

<style scoped>
.molecular-hero-fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100dvh;
  margin: 0;
  background: var(--wl-bg, #14161c);
  color: var(--wl-muted, #8b949e);
  font-family: var(--font-ui, monospace);
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
</style>
