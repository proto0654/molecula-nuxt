<script setup lang="ts">
defineProps<{
  sparse?: boolean;
  revealing?: boolean;
}>();
</script>

<template>
  <div
    class="case-page about-page"
    :class="{
      'is-revealing': revealing,
      'case-page--sparse': sparse,
    }"
  >
    <SiteChrome variant="section" section-label="ABOUT" />

    <div class="case-page__body about-page__body">
      <slot />
    </div>
  </div>
</template>
