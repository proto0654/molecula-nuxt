<script setup lang="ts">
defineProps<{
  label: string;
}>();

const { localizedPath } = useLocale();
const contactHref = computed(() => localizedPath('/contact'));
</script>

<template>
  <p class="about-cta editorial-section" data-enter="tail">
    <NuxtLink :to="contactHref" class="editorial-cta-link">{{ label }}</NuxtLink>
  </p>
</template>
