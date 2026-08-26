<script setup lang="ts">
import { archiveIndexHref } from '~/lib/navigation/archiveReturn';

const props = defineProps<{
  accentColor?: string | null;
  caseIndex?: number | null;
  /** Featured image — fixed backdrop under the decorative chrome grid. */
  backdropUrl?: string | null;
  /** Slug for archive → case shared visual (featured only). */
  visualSlug?: string | null;
  sparse?: boolean;
  textHero?: boolean;
  hasSlices?: boolean;
  landingOnly?: boolean;
  bodyClass?: string;
}>();

const archiveHref = ref('/portfolio');

onMounted(() => {
  archiveHref.value = archiveIndexHref();
});

const visualName = computed(() =>
  props.visualSlug && props.backdropUrl
    ? `case-visual-${props.visualSlug}`
    : undefined,
);
</script>

<template>
  <div
    class="case-page"
    :class="{
      'case-page--backdrop': backdropUrl,
      'case-page--sparse': sparse,
      'case-page--text-hero': textHero,
      'case-page--has-slices': hasSlices,
      'case-page--landing-only': landingOnly,
    }"
    :style="accentColor ? { '--case-accent': accentColor } : undefined"
  >
    <div
      v-if="backdropUrl"
      class="case-page__backdrop"
      :class="{ 'is-shared-visual': visualName }"
      aria-hidden="true"
      :style="{
        backgroundImage: `url(${backdropUrl})`,
        viewTransitionName: visualName,
      }"
    />

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
