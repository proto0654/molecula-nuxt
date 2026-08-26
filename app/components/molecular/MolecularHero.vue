<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { setLabelFontUrl } from '~/lib/molecular/AtomLabel';
import { mountHeroApp, type MountedHeroApp } from '~/lib/hero/mountHeroApp';
import {
  setTransitionHandler,
  transitionTo,
} from '~/lib/navigation/TransitionController';

const spatial = useSpatialState();

const stageRef = ref<HTMLElement | null>(null);
const chromeRef = ref<HTMLElement | null>(null);
let hero: MountedHeroApp | null = null;

onMounted(() => {
  const stage = stageRef.value;
  const chrome = chromeRef.value;
  if (!stage || !chrome) return;

  const config = useRuntimeConfig();
  const baseURL = config.app.baseURL || '/';
  setLabelFontUrl(`${baseURL}fonts/JetBrainsMono-Regular.ttf`);

  setTransitionHandler(async (route, options) => {
    await navigateTo(route, {
      replace: options?.replace,
      external: options?.external,
    });
  });

  hero = mountHeroApp(stage, {
    chromeRoot: chrome,
    onNavigateRoute: (route) => transitionTo(route),
  });

  hero.applySpatial(spatial.value, { immediate: true });
});

watch(spatial, (state) => {
  hero?.applySpatial(state);
});

onBeforeUnmount(() => {
  setTransitionHandler(null);
  hero?.dispose();
  hero = null;
});
</script>

<template>
  <div class="molecular-shell" aria-label="Molecular shell">
    <div id="hero-stage" ref="stageRef" class="molecular-hero" />
    <div ref="chromeRef" class="molecular-chrome" />
  </div>
</template>
