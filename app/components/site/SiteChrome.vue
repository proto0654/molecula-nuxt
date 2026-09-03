<script setup lang="ts">
import { padCaseIndex } from '~/domain/portfolio/presentation';
import { routeChromeLabel } from '~/lib/navigation/routeChromeLabel';

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
</script>

<template>
  <header class="case-chrome__header case-chrome__header--meta">
    <div class="case-chrome__meta">
      <slot name="meta">
        <p
          v-if="variant === 'archive'"
          class="case-chrome__index"
        >
          {{ routeLabel }}
        </p>
        <p
          v-else-if="variant === 'section'"
          class="case-chrome__index"
        >
          {{ sectionLabel }}
        </p>
        <template v-else>
          <p v-if="caseIndex" class="case-chrome__index">
            {{ entityLabel }} / {{ padCaseIndex(caseIndex) }}
          </p>
          <NuxtLink :to="archiveHref" class="case-chrome__archive">{{ indexKicker }}</NuxtLink>
        </template>
      </slot>
    </div>
  </header>
</template>
