<script setup lang="ts">
import { padCaseIndex } from '~/domain/portfolio/presentation';

const props = withDefaults(
  defineProps<{
    page: number;
    totalPages: number;
    basePath?: string;
  }>(),
  { basePath: '/portfolio' },
);

function pageHref(n: number): string {
  if (n <= 1) return props.basePath;
  return `${props.basePath}?page=${n}`;
}

const pages = computed(() =>
  Array.from({ length: props.totalPages }, (_, i) => i + 1),
);
</script>

<template>
  <nav
    v-if="totalPages > 1"
    class="archive-pagination"
    data-enter="tail"
    aria-label="Пагинация"
  >
    <NuxtLink
      v-if="page > 1"
      v-slot="{ href, navigate }"
      :to="pageHref(page - 1)"
      custom
    >
      <a
        :href="href"
        class="archive-pagination__arrow"
        aria-label="Предыдущая страница"
        @click="navigate"
      >←</a>
    </NuxtLink>
    <NuxtLink
      v-for="n in pages"
      :key="n"
      v-slot="{ href, navigate }"
      :to="pageHref(n)"
      custom
    >
      <a
        :href="href"
        class="archive-pagination__page"
        :aria-current="n === page ? 'page' : undefined"
        @click="navigate"
      >{{ padCaseIndex(n) }}</a>
    </NuxtLink>
    <NuxtLink
      v-if="page < totalPages"
      v-slot="{ href, navigate }"
      :to="pageHref(page + 1)"
      custom
    >
      <a
        :href="href"
        class="archive-pagination__arrow"
        aria-label="Следующая страница"
        @click="navigate"
      >→</a>
    </NuxtLink>
  </nav>
</template>
