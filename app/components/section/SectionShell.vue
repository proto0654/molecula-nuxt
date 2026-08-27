<script setup lang="ts">
defineProps<{
  meta: string;
  revealing?: boolean;
}>();
</script>

<template>
  <div
    class="archive-page section-page"
    :class="{ 'is-revealing': revealing }"
  >
    <SiteChrome variant="section" :section-label="meta" />
    <div class="archive-page__body">
      <slot />
    </div>
  </div>
</template>
