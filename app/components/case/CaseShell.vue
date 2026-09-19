<script setup lang="ts">
import {
  archiveIndexHref,
  resolveCasePortfolioArchiveHref,
  type ArchiveReturnScope,
} from '~/lib/navigation/archiveReturn';
import { localizedPath } from '~/domain/i18n';

const props = withDefaults(
  defineProps<{
    accentColor?: string | null;
    caseIndex?: number | null;
    sparse?: boolean;
    hasSlices?: boolean;
    landingOnly?: boolean;
    bodyClass?: string;
    revealing?: boolean;
    archiveScope?: ArchiveReturnScope;
  }>(),
  { archiveScope: 'portfolio' },
);

const route = useRoute();
const { locale } = useLocale();

const root = ref<HTMLElement | null>(null);
const revealingGate = computed(() => Boolean(props.revealing));

useListingReveal(root, revealingGate);

function defaultArchiveHref(scope: ArchiveReturnScope): string {
  if (scope === 'services') return localizedPath('/services', locale.value);
  if (scope === 'portfolio-legacy') {
    return localizedPath('/portfolio/legacy', locale.value);
  }
  return localizedPath('/portfolio', locale.value);
}

function resolveArchiveHref(scope: ArchiveReturnScope): string {
  return (
    resolveCasePortfolioArchiveHref(route.path, locale.value) ??
    archiveIndexHref(undefined, scope, locale.value)
  );
}

/** SSR-stable; sessionStorage pagination applied after mount. */
const archiveHref = ref(defaultArchiveHref(props.archiveScope));

function refreshArchiveHref() {
  archiveHref.value = resolveArchiveHref(props.archiveScope);
}

onMounted(() => {
  refreshArchiveHref();
});

watch([locale, () => props.archiveScope, () => route.path], () => {
  refreshArchiveHref();
});

defineExpose({ root });
</script>

<template>
  <div
    ref="root"
    class="case-page"
    :class="{
      'case-page--sparse': sparse,
      'case-page--has-slices': hasSlices,
      'case-page--landing-only': landingOnly,
      'is-revealing': revealing,
    }"
    :style="accentColor ? { '--case-accent': accentColor } : undefined"
  >
    <SiteChrome
      variant="case"
      :case-index="caseIndex"
      :archive-href="archiveHref"
    />

    <div class="case-page__body" :class="bodyClass">
      <slot />
    </div>
  </div>
</template>
