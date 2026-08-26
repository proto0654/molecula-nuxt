<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { setLabelFontUrl } from '~/lib/molecular/AtomLabel';
import { mountHeroApp } from '~/lib/hero/mountHeroApp';
import {
  setTransitionHandler,
  transitionTo,
} from '~/lib/navigation/TransitionController';
import { handoffRouteVeil } from '~/lib/navigation/routeVeil';

const rootRef = ref<HTMLElement | null>(null);
let disposeHero: (() => void) | null = null;

onMounted(() => {
  const root = rootRef.value;
  if (!root) return;

  const config = useRuntimeConfig();
  const baseURL = config.app.baseURL || '/';
  setLabelFontUrl(`${baseURL}fonts/JetBrainsMono-Regular.ttf`);

  setTransitionHandler(async (route, options) => {
    await navigateTo(route, {
      replace: options?.replace,
      external: options?.external,
    });
  });

  disposeHero = mountHeroApp(root, {
    onNavigateRoute: (route) => {
      handoffRouteVeil();
      return transitionTo(route);
    },
  });
});

onBeforeUnmount(() => {
  setTransitionHandler(null);
  disposeHero?.();
  disposeHero = null;
});
</script>

<template>
  <div
    id="app"
    ref="rootRef"
    class="molecular-hero"
    aria-label="Molecular hero"
  />
</template>
