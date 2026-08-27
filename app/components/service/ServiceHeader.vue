<script setup lang="ts">
import type { Service } from '~/types/wp';
import { padCaseIndex, stripTags } from '~/domain/portfolio/presentation';

const props = withDefaults(
  defineProps<{
    service: Service;
    serviceIndex?: number | null;
    revealReady?: boolean;
  }>(),
  { revealReady: true },
);

const titlePlain = computed(() => stripTags(props.service.title));
</script>

<template>
  <header class="case-header service-header">
    <p v-if="serviceIndex" class="case-header__index">
      SERVICE / {{ padCaseIndex(serviceIndex) }}
    </p>
    <SiteScrambleTitle
      class="case-header__title"
      :text="titlePlain"
      :ready="revealReady"
    />
    <ul v-if="service.tags.length" class="editorial-header__tags">
      <li v-for="tag in service.tags" :key="tag" class="editorial-header__tag">
        {{ tag }}
      </li>
    </ul>
  </header>
</template>
