<script setup lang="ts">
import { archiveIndexHref } from '~/lib/navigation/archiveReturn';

const props = defineProps<{
  accentColor?: string | null;
  caseIndex?: number | null;
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
</script>

<template>
  <div
    class="case-page"
    :class="{
      'case-page--sparse': sparse,
      'case-page--text-hero': textHero,
      'case-page--has-slices': hasSlices,
      'case-page--landing-only': landingOnly,
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
