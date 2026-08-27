<script setup lang="ts">
import { archiveIndexHref } from '~/lib/navigation/archiveReturn';

const props = withDefaults(
  defineProps<{
    revealing?: boolean;
    washesReady?: boolean;
    detailIndex?: number | null;
    detailVariant?: 'service' | 'case';
    archiveScope?: 'services' | 'portfolio';
  }>(),
  {
    detailIndex: null,
    detailVariant: 'service',
    archiveScope: 'portfolio',
  },
);

const archiveHref = ref(
  props.archiveScope === 'services' ? '/services' : '/portfolio',
);

onMounted(() => {
  archiveHref.value = archiveIndexHref(undefined, props.archiveScope);
});

const chromeVariant = computed(() =>
  props.detailIndex ? props.detailVariant : 'archive',
);
</script>

<template>
  <div
    class="archive-page"
    :class="{
      'is-revealing': revealing,
      'is-washes-ready': washesReady,
    }"
  >
    <SiteChrome
      :variant="chromeVariant"
      :case-index="detailIndex"
      :archive-href="archiveHref"
    />
    <div class="archive-page__body">
      <slot />
    </div>
  </div>
</template>
