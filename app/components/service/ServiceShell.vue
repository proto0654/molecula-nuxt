<script setup lang="ts">
import { archiveIndexHref } from '~/lib/navigation/archiveReturn';

defineProps<{
  serviceIndex?: number | null;
  sparse?: boolean;
  revealing?: boolean;
}>();

const archiveHref = ref('/services');

onMounted(() => {
  archiveHref.value = archiveIndexHref(undefined, 'services');
});
</script>

<template>
  <div
    class="case-page service-page"
    :class="{
      'is-revealing': revealing,
      'case-page--sparse': sparse,
    }"
  >
    <SiteChrome
      variant="service"
      :case-index="serviceIndex"
      :archive-href="archiveHref"
    />

    <div class="case-page__body service-page__body">
      <slot />
    </div>
  </div>
</template>
