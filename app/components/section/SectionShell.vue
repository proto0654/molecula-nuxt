<script setup lang="ts">
defineProps<{
  meta: string;
}>();
</script>

<template>
  <div class="archive-page section-page">
    <SiteChrome variant="section" :section-label="meta" />
    <div class="archive-page__body">
      <slot />
    </div>
  </div>
</template>
