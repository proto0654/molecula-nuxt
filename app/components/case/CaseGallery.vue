<script setup lang="ts">
import type { Case } from '~/types/wp';

defineProps<{
  caseData: Case;
}>();
</script>

<template>
  <section v-if="caseData.gallery.length" class="mb-12">
    <h2 class="mb-4 text-[var(--text-meta)] uppercase tracking-[var(--track-meta)] text-[var(--wl-muted)]">
      Gallery
    </h2>
    <ul class="grid gap-4 sm:grid-cols-2">
      <li
        v-for="(item, index) in caseData.gallery"
        :key="item.image.id + '-' + index"
        class="border border-[var(--wl-line)]"
      >
        <img
          :src="item.image.sizes['weblaba-screen'] ?? item.image.url"
          :alt="item.image.alt || `${caseData.title} ${index + 1}`"
          class="w-full"
          loading="lazy"
        />
      </li>
    </ul>
  </section>
</template>
