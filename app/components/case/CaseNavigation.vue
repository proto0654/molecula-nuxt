<script setup lang="ts">
defineProps<{
  prevSlug: string | null;
  nextSlug: string | null;
  prevTitle?: string | null;
  nextTitle?: string | null;
}>();
</script>

<template>
  <nav
    class="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--wl-line)] pt-8 text-sm"
    aria-label="Case navigation"
  >
    <NuxtLink
      v-if="prevSlug"
      :to="`/portfolio/${prevSlug}`"
      class="text-[var(--wl-muted)] hover:text-[var(--wl-accent)]"
    >
      ← {{ prevTitle || 'Prev' }}
    </NuxtLink>
    <span v-else class="text-[var(--wl-muted)] opacity-40">← Prev</span>

    <NuxtLink
      to="/portfolio"
      class="text-[var(--wl-muted)] underline-offset-4 hover:text-[var(--wl-accent)] hover:underline"
    >
      Archive
    </NuxtLink>

    <NuxtLink
      v-if="nextSlug"
      :to="`/portfolio/${nextSlug}`"
      class="text-[var(--wl-muted)] hover:text-[var(--wl-accent)]"
    >
      {{ nextTitle || 'Next' }} →
    </NuxtLink>
    <span v-else class="text-[var(--wl-muted)] opacity-40">Next →</span>
  </nav>
</template>
