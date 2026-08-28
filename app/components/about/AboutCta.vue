<script setup lang="ts">
defineProps<{
  label: string;
}>();
</script>

<template>
  <p class="about-cta editorial-section" data-enter="tail">
    <NuxtLink to="/contact" class="editorial-cta-link">{{ label }}</NuxtLink>
  </p>
</template>
