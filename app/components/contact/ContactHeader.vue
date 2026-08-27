<script setup lang="ts">
withDefaults(
  defineProps<{
    revealReady?: boolean;
  }>(),
  { revealReady: true },
);
</script>

<template>
  <header class="case-header contact-header">
    <SiteScrambleTitle
      class="case-header__title"
      text="Контакты"
      :ready="revealReady"
    />
  </header>
</template>
