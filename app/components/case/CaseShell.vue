<script setup lang="ts">
defineProps<{
  accentColor?: string | null;
  caseIndex?: number | null;
  /** Featured image — fixed backdrop under the decorative chrome grid. */
  backdropUrl?: string | null;
}>();
</script>

<template>
  <div
    class="case-page"
    :class="{ 'case-page--backdrop': backdropUrl }"
    :style="accentColor ? { '--case-accent': accentColor } : undefined"
  >
    <div
      v-if="backdropUrl"
      class="case-page__backdrop"
      aria-hidden="true"
      :style="{ backgroundImage: `url(${backdropUrl})` }"
    />

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
        <p v-if="caseIndex" class="case-chrome__index">
          CASE / {{ String(caseIndex).padStart(2, '0') }}
        </p>
        <NuxtLink to="/portfolio" class="case-chrome__archive">Index</NuxtLink>
      </div>
    </header>

    <div class="case-page__body">
      <slot />
    </div>
  </div>
</template>
