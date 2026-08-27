<script setup lang="ts">
defineProps<{
  label: string;
  sectionIndex: number;
}>();
</script>

<template>
  <CaseSection :index="sectionIndex" label="Contact" tone="editorial">
    <p class="about-cta">
      <NuxtLink to="/contact" class="editorial-cta-link">{{ label }}</NuxtLink>
    </p>
  </CaseSection>
</template>
