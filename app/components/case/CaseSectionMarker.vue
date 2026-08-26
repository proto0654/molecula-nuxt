<script setup lang="ts">
import {
  padCaseIndex,
  type CaseSectionTone,
} from '~/domain/portfolio/presentation';

withDefaults(
  defineProps<{
    index: number;
    label: string;
    tone?: CaseSectionTone;
  }>(),
  { tone: 'editorial' },
);
</script>

<template>
  <header class="case-marker" :class="`case-marker--${tone}`">
    <span class="case-marker__num">{{ padCaseIndex(index) }}</span>
    <span class="case-marker__slash" aria-hidden="true">/</span>
    <span class="case-marker__label">{{ label }}</span>
  </header>
</template>
