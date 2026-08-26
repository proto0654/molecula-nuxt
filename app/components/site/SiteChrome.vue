<script setup lang="ts">
import { padCaseIndex } from '~/domain/portfolio/presentation';

withDefaults(
  defineProps<{
    variant?: 'archive' | 'case' | 'section';
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
</script>

<template>
  <header class="case-chrome__header case-chrome__header--meta">
    <div class="case-chrome__meta">
      <slot name="meta">
        <p
          v-if="variant === 'archive'"
          class="case-chrome__index"
          aria-current="page"
        >
          ARCHIVE
        </p>
        <p
          v-else-if="variant === 'section'"
          class="case-chrome__index"
          aria-current="page"
        >
          {{ sectionLabel }}
        </p>
        <template v-else>
          <p v-if="caseIndex" class="case-chrome__index">
            CASE / {{ padCaseIndex(caseIndex) }}
          </p>
          <NuxtLink :to="archiveHref" class="case-chrome__archive">Index</NuxtLink>
        </template>
      </slot>
    </div>
  </header>
</template>
