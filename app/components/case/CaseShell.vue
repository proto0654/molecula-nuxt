<script setup lang="ts">
import {
  archiveIndexHref,
  resolveCasePortfolioArchiveHref,
  type ArchiveReturnScope,
} from '~/lib/navigation/archiveReturn';

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

function resolveArchiveHref(scope: ArchiveReturnScope): string {
  return (
    resolveCasePortfolioArchiveHref(route.path, locale.value) ??
    archiveIndexHref(undefined, scope, locale.value)
  );
}

const archiveHref = computed(() => resolveArchiveHref(props.archiveScope));

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
