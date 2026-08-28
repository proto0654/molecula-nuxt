<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();

const message = computed(() => {
  if (props.error.statusCode === 404) return 'Page not found.';
  return props.error.statusMessage || 'Something went wrong.';
});

const errorTitle = computed(() =>
  props.error.statusCode === 404 ? 'Страница не найдена' : 'Ошибка',
);

usePageSeo({
  title: errorTitle,
  description: 'Запрошенная страница недоступна. Вернитесь на главную WebLaba.',
});
</script>

<template>
  <div class="flex min-h-screen flex-col items-start justify-center bg-[var(--wl-bg)] px-6 text-[var(--wl-text)]">
    <p class="text-[var(--text-meta)] uppercase tracking-[var(--track-meta)] text-[var(--wl-muted)]">
      {{ error.statusCode || 500 }}
    </p>
    <h1 class="mt-2 text-xl text-[var(--wl-accent)]">{{ message }}</h1>
    <p class="mt-2 text-sm text-[var(--wl-muted)]">
      Try again later.
    </p>
    <NuxtLink
      to="/"
      class="mt-6 text-sm text-[var(--wl-muted)] underline-offset-4 hover:text-[var(--wl-accent)] hover:underline"
    >
      ← Home
    </NuxtLink>
  </div>
</template>
