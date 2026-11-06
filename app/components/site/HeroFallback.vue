<script setup lang="ts">
import { resolveHeroChromeCopy } from '~/domain/options/heroChromeCopy';
import { createDisposalScope } from '~/lib/hero/disposalScope';
import { HudFrame } from '~/lib/hero-ui/HudFrame';
import { MobileNavOverlay } from '~/lib/hero-ui/MobileNavOverlay';
import { Navigation } from '~/lib/hero-ui/Navigation';
import { SiteHeader } from '~/lib/hero-ui/SiteHeader';
import { createSiteLogoMark } from '~/lib/hero-ui/siteLogoMark';
import { applyNavigationItems, getItemById } from '~/lib/navigation/navigationConfig';
import { NavigationState } from '~/lib/navigation/NavigationState';
import { setTransitionHandler, transitionTo } from '~/lib/navigation/TransitionController';
import { HOME_ITEM_ID, itemIdForContext } from '~/lib/spatial/spatialAtoms';

const spatial = useSpatialState();
const isHome = computed(() => spatial.value.mode === 'home');
const router = useRouter();
const assetBaseURL = useRuntimeConfig().app.baseURL || '/';
const { navItems } = useMoleculeHeroNav();
const { options } = useThemeOptions();
const chromeCopy = computed(() => resolveHeroChromeCopy(options.value.ui));
const homeUsp = computed(() => navItems.value.find((item) => item.id === HOME_ITEM_ID)?.usp);
const stageRef = ref<HTMLElement | null>(null);
const chromeRef = ref<HTMLElement | null>(null);
const brandRef = ref<HTMLElement | null>(null);
const scope = createDisposalScope();
let hud: HudFrame | null = null;
let header: SiteHeader | null = null;
let navigation: Navigation | null = null;
let menu: MobileNavOverlay | null = null;
let state: NavigationState | null = null;

function setMenuOpen(open: boolean): void {
  menu?.setOpen(open);
  header?.setMenuOpen(open);
}

function selectItem(id: string): void {
  const route = getItemById(id)?.route;
  if (!route) return;
  setMenuOpen(false);
  void transitionTo(route);
}

function syncSelection(): void {
  const current = spatial.value;
  state?.setCommitted(current.mode === 'home'
    ? HOME_ITEM_ID
    : current.context ? itemIdForContext(current.context) : current.sectionId ?? null);
}

function syncCopy(): void {
  for (const part of [hud, header, navigation, menu]) part?.setChromeCopy(chromeCopy.value);
}

onMounted(() => {
  if (!stageRef.value || !chromeRef.value) return;
  applyNavigationItems(navItems.value);
  state = new NavigationState();
  hud = new HudFrame(stageRef.value);
  scope.add(() => hud?.dispose());
  header = new SiteHeader(chromeRef.value, state, {
    assetBaseURL,
    route: router.currentRoute.value,
    resolveHref: (route) => router.resolve(route).href,
  });
  scope.add(() => header?.dispose());
  navigation = new Navigation(chromeRef.value, state, selectItem);
  scope.add(() => navigation?.dispose());
  menu = new MobileNavOverlay(chromeRef.value, state, {
    assetBaseURL,
    onHome: () => selectItem(HOME_ITEM_ID),
    onSelect: selectItem,
    onClose: () => setMenuOpen(false),
  });
  scope.add(() => menu?.dispose());
  header.onSelectItem(selectItem);
  header.onToggleMenu(() => setMenuOpen(!menu?.isOpen));
  setTransitionHandler(async (route, options) => {
    await navigateTo(route, { replace: options?.replace, external: options?.external });
  });
  scope.add(() => setTransitionHandler(null));
  scope.add(router.afterEach((route, _from, failure) => {
    if (failure) return;
    setMenuOpen(false);
    header?.setRoute(route);
  }));
  syncCopy();
  syncSelection();
});

watch(navItems, (items) => {
  if (!header) return;
  applyNavigationItems(items);
  for (const part of [header, navigation, menu]) part?.syncNavigationCopy();
}, { deep: true });
watch(chromeCopy, syncCopy);
watch(spatial, syncSelection);
watch(brandRef, (host) => {
  host?.replaceChildren(createSiteLogoMark(assetBaseURL));
}, { flush: 'post' });
onBeforeUnmount(scope.dispose);
</script>

<template>
  <div class="hero-fallback">
    <div id="hero-stage" ref="stageRef" class="molecular-hero" />
    <div ref="chromeRef" class="molecular-chrome" :class="{ 'is-home': isHome }" />
    <div v-if="isHome" class="hero-fallback__composition">
      <div ref="brandRef" class="hero-fallback__brand" role="img" :aria-label="chromeCopy.logoAriaLabel" />
      <p v-if="homeUsp" class="hero-fallback__usp">{{ homeUsp }}</p>
    </div>
  </div>
</template>

<style scoped>
.hero-fallback__composition {
  position: fixed;
  inset: 0;
  z-index: var(--z-page);
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 2rem;
  padding: 6rem 2rem;
  pointer-events: none;
  text-align: center;
}

.hero-fallback__brand :deep(.site-logo-mark) {
  flex-direction: column;
  gap: 1.5rem;
  padding: 0;
}

.hero-fallback__brand :deep(.site-logo-mark__img) {
  width: clamp(8rem, 20vw, 15rem);
  height: auto;
}

.hero-fallback__brand :deep(.site-logo-mark__word) {
  font: clamp(1rem, 2vw, 1.5rem) var(--font-ui);
  letter-spacing: 0.28em;
  padding-left: 0.28em;
}

.hero-fallback__usp {
  max-width: 42ch;
  margin: 0;
  color: var(--ui-muted);
  font: 0.75rem/1.7 var(--font-ui);
}

.hero-fallback :deep(.hero-slide-progress) {
  display: none;
}
</style>
