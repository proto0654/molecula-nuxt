<script setup lang="ts">
defineProps<{
  revealing?: boolean;
  washesReady?: boolean;
}>();
</script>

<template>
  <div
    class="archive-page"
    :class="{
      'is-revealing': revealing,
      'is-washes-ready': washesReady,
    }"
  >
    <SiteChrome variant="archive" />
    <div class="archive-page__body">
      <slot />
    </div>
  </div>
</template>
