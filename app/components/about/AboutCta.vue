<script setup lang="ts">
defineProps<{
  label: string;
}>();
</script>

<template>
  <p class="about-cta">
    <NuxtLink to="/contact" class="about-cta__link">{{ label }}</NuxtLink>
  </p>
</template>
