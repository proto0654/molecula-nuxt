<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';
import { padCaseIndex } from '~/domain/portfolio/presentation';
import { routeChromeLabel } from '~/lib/navigation/routeChromeLabel';
import { setChromeInfo } from '~/lib/hero-ui/chromeInfoBridge';

const props = withDefaults(
  defineProps<{
    variant?: 'archive' | 'case' | 'section' | 'service';
    caseIndex?: number | null;
    archiveHref?: string;
    sectionLabel?: string;
    archiveScope?: 'portfolio' | 'services';
  }>(),
  {
    variant: 'archive',
    caseIndex: null,
    archiveHref: '/portfolio',
    sectionLabel: 'SECTION',
    archiveScope: 'portfolio',
  },
);

const route = useRoute();

const indexKicker = useUiString('chrome_index_kicker');
const caseLabel = useUiString('chrome_case_label');
const serviceLabel = useUiString('chrome_service_label');

const entityLabel = computed(() =>
  props.variant === 'service' ? serviceLabel.value : caseLabel.value,
);

const routeLabel = computed(() => {
  const label = routeChromeLabel(route.path, props.archiveScope);
  return label ?? `ARCHIVE / ${props.archiveScope}`;
});

const labelText = computed(() => {
  if (props.variant === 'archive') return routeLabel.value;
  if (props.variant === 'section') return props.sectionLabel;
  if (props.caseIndex) {
    return `${entityLabel.value} / ${padCaseIndex(props.caseIndex)}`;
  }
  return null;
});

const linkHref = computed(() => {
  if (props.variant !== 'case' && props.variant !== 'service') return null;
  return props.archiveHref;
});

const linkText = computed(() => {
  if (!linkHref.value) return null;
  return indexKicker.value;
});

function sync() {
  setChromeInfo(labelText.value, linkHref.value, linkText.value);
}

onMounted(sync);
watch([labelText, linkHref, linkText], sync);
onBeforeUnmount(() => setChromeInfo(null));
</script>

<template>
  <!-- Data-only bridge: content rendered by SiteHeader.ts -->
  <span class="site-chrome-stub" />
</template>
