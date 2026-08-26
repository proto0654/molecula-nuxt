<script setup lang="ts">
import { padCaseIndex } from '~/domain/portfolio/presentation';

withDefaults(
  defineProps<{
    variant?: 'archive' | 'case';
    caseIndex?: number | null;
    archiveHref?: string;
  }>(),
  {
    variant: 'archive',
    caseIndex: null,
    archiveHref: '/portfolio',
  },
);
</script>

<template>
  <div class="case-chrome" aria-hidden="true">
    <div class="case-chrome__grid" />
    <div class="case-chrome__frame">
      <span class="case-chrome__corner case-chrome__corner--tl" />
      <span class="case-chrome__corner case-chrome__corner--tr" />
      <span class="case-chrome__corner case-chrome__corner--bl" />
      <span class="case-chrome__corner case-chrome__corner--br" />
    </div>
  </div>

  <header class="case-chrome__header">
    <NuxtLink to="/" class="case-chrome__logo">[ МАРК ] ЛОГО</NuxtLink>
    <div class="case-chrome__meta">
      <slot name="meta">
        <p
          v-if="variant === 'archive'"
          class="case-chrome__index"
          aria-current="page"
        >
          ARCHIVE
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
