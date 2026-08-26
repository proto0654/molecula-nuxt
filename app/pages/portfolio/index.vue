<script setup lang="ts">
const route = useRoute();

const page = computed(() => {
  const raw = route.query.page;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(String(value ?? '1'), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
});

const { cases, pagination, pending, error } = usePortfolio({ page, perPage: 12 });
const { data: categories } = usePortfolioCategories();

const categoryById = computed(() => {
  const map = new Map<number, string>();
  for (const cat of categories.value ?? []) {
    map.set(cat.id, cat.name);
  }
  return map;
});

function categoryLabel(ids: number[]): string | null {
  if (!ids.length) return null;
  const names = ids
    .map((id) => categoryById.value.get(id))
    .filter((n): n is string => Boolean(n));
  return names.length ? names.join(', ') : null;
}

function imageUrl(c: (typeof cases.value)[number]): string | null {
  const img = c.featuredImage ?? c.landingScreen;
  if (!img) return null;
  return img.sizes['weblaba-screen'] ?? img.sizes.medium_large ?? img.url;
}

function goPage(target: number) {
  if (target < 1 || target > pagination.value.totalPages) return;
  return navigateTo({
    path: '/portfolio',
    query: target <= 1 ? {} : { page: String(target) },
  });
}

useSeoMeta({
  title: 'Портфолио — WebLaba',
  description: 'Архив проектов WebLaba',
});
</script>

<template>
  <div class="min-h-screen bg-[var(--wl-bg)] px-4 py-10 text-[var(--wl-text)] md:px-8">
    <header class="mb-10 max-w-5xl">
      <p class="mb-2 text-[var(--text-meta)] uppercase tracking-[var(--track-meta)] text-[var(--wl-muted)]">
        Archive
      </p>
      <h1 class="font-[family-name:var(--font-ui)] text-2xl tracking-[var(--track-title)] text-[var(--wl-accent)] md:text-3xl">
        Portfolio
      </h1>
      <p class="mt-3 max-w-xl text-sm text-[var(--wl-muted)]">
        Реальные кейсы из WordPress. Без redesign — проверка content pipeline.
      </p>
      <NuxtLink
        to="/"
        class="mt-4 inline-block text-sm text-[var(--wl-muted)] underline-offset-4 hover:text-[var(--wl-accent)] hover:underline"
      >
        ← Hero
      </NuxtLink>
    </header>

    <p v-if="pending" class="text-sm text-[var(--wl-muted)]">Loading…</p>

    <p v-else-if="error" class="text-sm text-[var(--wl-muted)]">
      Portfolio unavailable.<br />
      Try again later.
    </p>

    <p v-else-if="!cases.length" class="text-sm text-[var(--wl-muted)]">
      No projects found.
    </p>

    <ul
      v-else
      class="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3"
    >
      <li v-for="item in cases" :key="item.id">
        <NuxtLink
          :to="`/portfolio/${item.slug}`"
          class="group block border border-[var(--wl-line)] transition-colors hover:border-[var(--wl-accent)]"
        >
          <div class="aspect-[4/3] overflow-hidden bg-[rgb(214_219_224/0.04)]">
            <img
              v-if="imageUrl(item)"
              :src="imageUrl(item)!"
              :alt="item.featuredImage?.alt || item.title"
              class="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
              loading="lazy"
            />
          </div>
          <div class="border-t border-[var(--wl-line)] px-3 py-3">
            <h2
              class="text-sm tracking-[var(--track-nav)] text-[var(--wl-accent)]"
              v-html="item.title"
            />
            <p
              v-if="categoryLabel(item.categoryIds)"
              class="mt-1 text-[var(--text-meta)] uppercase tracking-[var(--track-meta)] text-[var(--wl-muted)]"
            >
              {{ categoryLabel(item.categoryIds) }}
            </p>
          </div>
        </NuxtLink>
      </li>
    </ul>

    <nav
      v-if="pagination.totalPages > 1"
      class="mx-auto mt-12 flex max-w-5xl flex-wrap items-center gap-2"
      aria-label="Pagination"
    >
      <button
        type="button"
        class="border border-[var(--wl-line)] px-3 py-1 text-sm text-[var(--wl-muted)] disabled:opacity-40"
        :disabled="page <= 1 || pending"
        @click="goPage(page - 1)"
      >
        ←
      </button>
      <button
        v-for="n in pagination.totalPages"
        :key="n"
        type="button"
        class="min-w-8 border px-2 py-1 text-sm"
        :class="
          n === page
            ? 'border-[var(--wl-accent)] text-[var(--wl-accent)]'
            : 'border-[var(--wl-line)] text-[var(--wl-muted)]'
        "
        :disabled="pending"
        @click="goPage(n)"
      >
        {{ n }}
      </button>
      <button
        type="button"
        class="border border-[var(--wl-line)] px-3 py-1 text-sm text-[var(--wl-muted)] disabled:opacity-40"
        :disabled="page >= pagination.totalPages || pending"
        @click="goPage(page + 1)"
      >
        →
      </button>
      <span class="ml-2 text-[var(--text-meta)] text-[var(--wl-muted)]">
        {{ pagination.total }} total
      </span>
    </nav>
  </div>
</template>
