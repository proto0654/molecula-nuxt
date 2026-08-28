<script setup lang="ts">
import { archiveIndexHref } from '~/lib/navigation/archiveReturn';

const props = defineProps<{
  accentColor?: string | null;
  caseIndex?: number | null;
  sparse?: boolean;
  hasSlices?: boolean;
  landingOnly?: boolean;
  bodyClass?: string;
  revealing?: boolean;
}>();

const root = ref<HTMLElement | null>(null);
const revealingGate = computed(() => Boolean(props.revealing));

useListingReveal(root, revealingGate);

const archiveHref = ref('/portfolio');

onMounted(() => {
  archiveHref.value = archiveIndexHref();
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
