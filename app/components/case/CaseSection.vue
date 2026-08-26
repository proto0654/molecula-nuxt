<script setup lang="ts">
defineProps<{
  index: number;
  label: string;
}>();
</script>

<template>
  <section class="case-section case-grid">
    <header class="case-section__index case-zone-label">
      <span class="case-section__num">{{ String(index).padStart(2, '0') }}</span>
      <span class="case-section__label">{{ label }}</span>
    </header>
    <div class="case-section__body case-zone-body">
      <slot />
    </div>
  </section>
</template>
