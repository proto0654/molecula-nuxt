<script setup lang="ts">
defineProps<{
  revealing?: boolean;
}>();
</script>

<template>
  <div class="archive-page" :class="{ 'is-revealing': revealing }">
    <SiteChrome variant="archive" />
    <div class="archive-page__body">
      <slot />
    </div>
  </div>
</template>
