<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { resolveHeroChromeCopy } from '~/domain/options/heroChromeCopy';
import { setLabelFontUrl } from '~/lib/molecular/AtomLabel';
import { mountHeroApp, type MountedHeroApp } from '~/lib/hero/mountHeroApp';
import {
  setTransitionHandler,
  transitionTo,
} from '~/lib/navigation/TransitionController';
import {
  armPoseWaitForRoute,
  setAwaitingPose,
} from '~/lib/navigation/poseReveal';

const spatial = useSpatialState();
const router = useRouter();
const emit = defineEmits<{ ready: []; failed: [] }>();
const { tags } = useHeroTagCloud();
const { options } = useThemeOptions();
const { navItems } = useMoleculeHeroNav();

const heroChromeCopy = computed(() => resolveHeroChromeCopy(options.value.ui));

const stageRef = ref<HTMLElement | null>(null);
const chromeRef = ref<HTMLElement | null>(null);
let hero: MountedHeroApp | null = null;
let stopGuard: (() => void) | null = null;
let stopTransition: (() => void) | null = null;
let stopRouteSync: (() => void) | null = null;

function applyNavCopy(): void {
  hero?.setNavigationItems(navItems.value);
}

function applyChromeCopy(): void {
  hero?.setChromeCopy(heroChromeCopy.value);
}

function revealWhenSettled(): void {
  if (!hero || hero.isBusy()) return;
  nextTick(() => {
    requestAnimationFrame(() => {
      if (!hero || hero.isBusy()) return;
      setAwaitingPose(false);
    });
  });
}

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

  try {
    hero = mountHeroApp(stage, {
      chromeRoot: chrome,
      assetBaseURL: baseURL,
      route: router.currentRoute.value,
      resolveHref: (route) => router.resolve(route).href,
      onNavigateRoute: (route) => transitionTo(route),
      prefetchRoute: (route) => {
        void preloadRouteComponents(route);
      },
    });

    hero.setTagCloud(tags.value);
    applyNavCopy();
    applyChromeCopy();
    hero.applySpatial(spatial.value, { immediate: true });

    stopTransition = hero.onTransition((snap) => {
      if (!snap.busy) revealWhenSettled();
    });
    stopGuard = router.beforeEach((to, from) => {
      if (hero) armPoseWaitForRoute(to.path, from.path, from.matched.length);
    });
    stopRouteSync = router.afterEach((to, _from, failure) => {
      if (!failure) hero?.setRoute(to);
      else setAwaitingPose(false);
    });
    setAwaitingPose(false);
    emit('ready');
  } catch (error) {
    stopGuard?.();
    stopRouteSync?.();
    stopTransition?.();
    hero?.dispose();
    hero = null;
    setAwaitingPose(false);
    console.error('[hero] Failed to initialize molecular shell', error);
    emit('failed');
  }
});

watch(tags, (list) => {
  hero?.setTagCloud(list);
});

watch(
  navItems,
  () => {
    applyNavCopy();
  },
  { deep: true },
);

watch(heroChromeCopy, () => {
  applyChromeCopy();
});

watch(spatial, (state) => {
  if (!hero) {
    setAwaitingPose(false);
    return;
  }
  hero?.applySpatial(state);
  if (state.mode === 'home') {
    setAwaitingPose(false);
    return;
  }
  revealWhenSettled();
});

onBeforeUnmount(() => {
  stopGuard?.();
  stopGuard = null;
  stopTransition?.();
  stopTransition = null;
  stopRouteSync?.();
  stopRouteSync = null;
  setTransitionHandler(null);
  setAwaitingPose(false);
  hero?.dispose();
  hero = null;
});
</script>

<template>
  <div class="molecular-shell">
    <div id="hero-stage" ref="stageRef" class="molecular-hero" />
    <div ref="chromeRef" class="molecular-chrome" />
  </div>
</template>
