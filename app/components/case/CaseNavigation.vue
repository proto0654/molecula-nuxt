<script setup lang="ts">
defineProps<{
  prevSlug: string | null;
  nextSlug: string | null;
  prevTitle?: string | null;
  nextTitle?: string | null;
}>();
</script>

<template>
  <nav class="case-nav case-grid" aria-label="Case navigation">
    <div class="case-nav__item case-nav__prev">
      <NuxtLink
        v-if="prevSlug"
        :to="`/portfolio/${prevSlug}`"
        class="case-nav__link"
      >
        <span class="case-nav__dir">Prev</span>
        <span>{{ prevTitle || prevSlug }}</span>
      </NuxtLink>
      <span v-else class="case-nav__muted">
        <span class="case-nav__dir">Prev</span>
        —
      </span>
    </div>

    <div class="case-nav__item case-nav__index">
      <NuxtLink to="/portfolio" class="case-nav__link">
        <span class="case-nav__dir">Index</span>
        Archive
      </NuxtLink>
    </div>

    <div class="case-nav__item case-nav__next">
      <NuxtLink
        v-if="nextSlug"
        :to="`/portfolio/${nextSlug}`"
        class="case-nav__link"
      >
        <span class="case-nav__dir">Next</span>
        <span>{{ nextTitle || nextSlug }}</span>
      </NuxtLink>
      <span v-else class="case-nav__muted">
        <span class="case-nav__dir">Next</span>
        —
      </span>
    </div>
  </nav>
</template>
