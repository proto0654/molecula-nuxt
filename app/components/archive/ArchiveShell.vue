<script setup lang="ts">
import {
  archiveIndexHref,
  type ArchiveReturnScope,
} from '~/lib/navigation/archiveReturn';

const props = withDefaults(
  defineProps<{
    revealing?: boolean;
    detailIndex?: number | null;
    detailVariant?: 'service' | 'case';
    archiveScope?: ArchiveReturnScope;
    bodyClass?: string;
  }>(),
  {
    detailIndex: null,
    detailVariant: 'service',
    archiveScope: 'portfolio',
  },
);

const root = ref<HTMLElement | null>(null);
const revealingGate = computed(() => Boolean(props.revealing));

useListingReveal(root, revealingGate);

function defaultHref(scope: ArchiveReturnScope): string {
  if (scope === 'services') return '/services';
  if (scope === 'portfolio-legacy') return '/portfolio/legacy';
  return '/portfolio';
}

const archiveHref = ref(defaultHref(props.archiveScope));

/** Chrome label scope collapses portfolio-legacy → portfolio. */
const chromeScope = computed(() =>
  props.archiveScope === 'services' ? 'services' : 'portfolio',
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
    ref="root"
    class="archive-page"
    :class="{ 'is-revealing': revealing }"
  >
    <SiteChrome
      :variant="chromeVariant"
      :case-index="detailIndex"
      :archive-href="archiveHref"
      :archive-scope="chromeScope"
    />
    <div class="archive-page__body" :class="bodyClass">
      <slot />
    </div>
  </div>
</template>
