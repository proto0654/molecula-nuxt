<script setup lang="ts">
import {
  archiveIndexHref,
  type ArchiveReturnScope,
} from '~/lib/navigation/archiveReturn';
import { localizedPath } from '~/domain/i18n';

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
const { locale } = useLocale();

useListingReveal(root, revealingGate);

function defaultHref(scope: ArchiveReturnScope): string {
  if (scope === 'services') return localizedPath('/services', locale.value);
  if (scope === 'portfolio-legacy') return localizedPath('/portfolio/legacy', locale.value);
  return localizedPath('/portfolio', locale.value);
}

const archiveHref = ref(defaultHref(props.archiveScope));

/** Chrome label scope collapses portfolio-legacy → portfolio. */
const chromeScope = computed(() =>
  props.archiveScope === 'services' ? 'services' : 'portfolio',
);

function refreshArchiveHref() {
  archiveHref.value = archiveIndexHref(undefined, props.archiveScope, locale.value);
}

onMounted(() => {
  refreshArchiveHref();
});

watch(locale, () => {
  refreshArchiveHref();
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
