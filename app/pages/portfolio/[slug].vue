<script setup lang="ts">
import { getPortfolioCase, getPortfolioSlimIndex } from '~/api/portfolio';
import { getAdjacentCases } from '~/domain/portfolio/adjacent';
import {
  caseExcerptPlain,
  normalizePortfolioPost,
} from '~/domain/portfolio/normalizePortfolio';

const route = useRoute();
const slug = computed(() => String(route.params.slug || ''));

const { data, pending, error } = useAsyncData(
  () => `portfolio-case-${slug.value}`,
  async () => {
    if (!slug.value) {
      throw createError({ statusCode: 404, statusMessage: 'Case not found', fatal: true });
    }
    const raw = await getPortfolioCase(slug.value);
    if (!raw) {
      throw createError({ statusCode: 404, statusMessage: 'Case not found', fatal: true });
    }
    const caseData = normalizePortfolioPost(raw);
    const slim = await getPortfolioSlimIndex();
    const adjacent = getAdjacentCases(slug.value, slim);
    return { caseData, adjacent };
  },
  { watch: [slug] },
);

const caseData = computed(() => data.value?.caseData ?? null);
const adjacent = computed(() => data.value?.adjacent);

watch(
  caseData,
  (c) => {
    if (!c) return;
    const plainTitle = c.title.replace(/<[^>]*>/g, '').trim() || c.slug;
    useSeoMeta({
      title: `${plainTitle} — WebLaba`,
      description: caseExcerptPlain(c) ?? undefined,
    });
  },
  { immediate: true },
);
</script>

<template>
  <div
    class="min-h-screen bg-[var(--wl-bg)] px-4 py-10 text-[var(--wl-text)] md:px-8"
    :style="
      caseData?.accentColor
        ? { '--case-accent': caseData.accentColor }
        : undefined
    "
  >
    <div class="mx-auto max-w-4xl">
      <p v-if="pending" class="text-sm text-[var(--wl-muted)]">Loading…</p>

      <p v-else-if="error && (!('statusCode' in error) || error.statusCode !== 404)" class="text-sm text-[var(--wl-muted)]">
        Case unavailable.<br />
        Try again later.
      </p>

      <template v-else-if="caseData">
        <CaseHeader :case-data="caseData" />
        <CaseContent :case-data="caseData" />
        <CaseVideo :case-data="caseData" />
        <CaseGallery :case-data="caseData" />
        <CaseMobile :case-data="caseData" />
        <CaseSlices :case-data="caseData" />
        <CaseNavigation
          :prev-slug="adjacent?.prev?.slug ?? null"
          :next-slug="adjacent?.next?.slug ?? null"
          :prev-title="adjacent?.prev?.slug ?? null"
          :next-title="adjacent?.next?.slug ?? null"
        />
      </template>
    </div>
  </div>
</template>
