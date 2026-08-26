<script setup lang="ts">
import type { ArchiveEntry } from '~/domain/portfolio/archive';
import {
  archiveHasSharedVisual,
  archiveMetaLabel,
  archiveSpecimenImage,
  archiveSpecimenUrl,
  archiveTitlePlain,
} from '~/domain/portfolio/archive';
import { padCaseIndex } from '~/domain/portfolio/presentation';
import { saveArchiveReturn } from '~/lib/navigation/archiveReturn';
import { prefersReducedMotion } from '~/lib/a11y/reducedMotion';

const props = defineProps<{
  entry: ArchiveEntry;
  page: number;
  eager?: boolean;
  categoryById: Map<number, string>;
}>();

const item = computed(() => props.entry.item);
const title = computed(() => archiveTitlePlain(item.value));
const meta = computed(() => archiveMetaLabel(item.value, props.categoryById));
const specimen = computed(() => archiveSpecimenImage(item.value));
const specimenUrl = computed(() => archiveSpecimenUrl(item.value));
const sharedVisual = computed(() => archiveHasSharedVisual(item.value));
const href = computed(() => `/portfolio/${item.value.slug}`);
const visualName = computed(() =>
  sharedVisual.value ? `case-visual-${item.value.slug}` : undefined,
);

function onNavigate(event: MouseEvent) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (event.button !== 0) return;

  saveArchiveReturn({
    page: props.page,
    slug: item.value.slug,
    y: window.scrollY,
  });

  if (prefersReducedMotion()) return;
  if (!sharedVisual.value) return;
  if (typeof document === 'undefined') return;
  if (typeof document.startViewTransition !== 'function') return;

  event.preventDefault();
  document.startViewTransition(async () => {
    await navigateTo(href.value);
  });
}
</script>

<template>
  <li class="archive-row" :data-slug="item.slug">
    <NuxtLink
      :to="href"
      class="archive-row__link"
      @click="onNavigate"
    >
      <span class="archive-row__index">{{ padCaseIndex(entry.index) }}</span>
      <span class="archive-row__copy">
        <span class="archive-row__title">{{ title }}</span>
        <span class="archive-row__meta">
          <span class="archive-row__category">{{ meta }}</span>
          <span class="archive-row__line" aria-hidden="true" />
          <span class="archive-row__arrow" aria-hidden="true">→</span>
        </span>
      </span>
      <span
        class="archive-row__specimen"
        :class="{ 'is-shared': sharedVisual }"
        :style="visualName ? { viewTransitionName: visualName } : undefined"
      >
        <img
          v-if="specimenUrl && specimen"
          :src="specimenUrl"
          :alt="specimen.alt || title"
          :width="specimen.width ?? undefined"
          :height="specimen.height ?? undefined"
          :loading="eager ? 'eager' : 'lazy'"
          decoding="async"
        />
      </span>
    </NuxtLink>
  </li>
</template>
