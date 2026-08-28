<script setup lang="ts">
import { padCaseIndex } from '~/domain/portfolio/presentation';

const props = withDefaults(
  defineProps<{
    variant?: 'archive' | 'case' | 'section' | 'service';
    caseIndex?: number | null;
    archiveHref?: string;
    sectionLabel?: string;
  }>(),
  {
    variant: 'archive',
    caseIndex: null,
    archiveHref: '/portfolio',
    sectionLabel: 'SECTION',
  },
);

const entityLabel = computed(() => (props.variant === 'service' ? 'SERVICE' : 'CASE'));
</script>

<template>
  <header class="case-chrome__header case-chrome__header--meta">
    <div class="case-chrome__meta">
      <slot name="meta">
        <p
          v-if="variant === 'archive'"
          class="case-chrome__index"
        >
          ARCHIVE
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
          <NuxtLink :to="archiveHref" class="case-chrome__archive">Index</NuxtLink>
        </template>
      </slot>
    </div>
  </header>
</template>
