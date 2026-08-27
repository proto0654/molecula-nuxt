<script setup lang="ts">
defineProps<{
  sparse?: boolean;
  revealing?: boolean;
}>();
</script>

<template>
  <div
    class="case-page contact-page"
    :class="{
      'is-revealing': revealing,
      'case-page--sparse': sparse,
    }"
  >
    <SiteChrome variant="section" section-label="CONTACT" />

    <div class="case-page__body contact-page__body">
      <slot />
    </div>
  </div>
</template>
