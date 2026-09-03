<script setup lang="ts">
import type { ArchiveEntry } from '~/domain/portfolio/archive';
import {
  archiveMetaLabel,
  archiveSpecimenImage,
  archiveSpecimenSrcSet,
  archiveSpecimenUrl,
  archiveTitlePlain,
} from '~/domain/portfolio/archive';
import { padCaseIndex } from '~/domain/portfolio/presentation';
import {
  saveArchiveReturn,
  type ArchiveReturnScope,
} from '~/lib/navigation/archiveReturn';

const props = withDefaults(
  defineProps<{
    entry: ArchiveEntry;
    page: number;
    eager?: boolean;
    categoryById: Map<number, string>;
    /** Shelf caption when the case has no portfolio_category (e.g. «Актуальные кейсы»). */
    metaFallback?: string | null;
    archiveScope?: ArchiveReturnScope;
  }>(),
  { archiveScope: 'portfolio' },
);

const item = computed(() => props.entry.item);
const title = computed(() => archiveTitlePlain(item.value));
const meta = computed(() =>
  archiveMetaLabel(item.value, props.categoryById, props.metaFallback),
);
const specimen = computed(() => archiveSpecimenImage(item.value));
const specimenUrl = computed(() => archiveSpecimenUrl(item.value));
const specimenSrcSet = computed(() => archiveSpecimenSrcSet(item.value));
const { localizedPath } = useLocale();
const href = computed(() => localizedPath(`/portfolio/${item.value.slug}`));

function onNavigate() {
  saveArchiveReturn(
    {
      page: props.page,
      slug: item.value.slug,
      y: window.scrollY,
    },
    props.archiveScope,
  );
}
</script>

<template>
  <li class="archive-row" :data-slug="item.slug">
    <NuxtLink :to="href" class="archive-row__link" @click="onNavigate">
      <span class="archive-row__index">{{ padCaseIndex(entry.index) }}</span>
      <span class="archive-row__copy">
        <ul v-if="item.tags.length" class="archive-row__tags">
          <li v-for="tag in item.tags" :key="tag" class="archive-row__tag">
            {{ tag }}
          </li>
        </ul>
        <span class="archive-row__title">{{ title }}</span>
        <span class="archive-row__meta">
          <span class="archive-row__category">{{ meta }}</span>
          <span class="archive-row__line" aria-hidden="true" />
          <span class="archive-row__arrow" aria-hidden="true">→</span>
        </span>
      </span>
      <span class="archive-row__specimen">
        <img
          v-if="specimenUrl && specimen"
          :src="specimenUrl"
          :srcset="specimenSrcSet ?? undefined"
          :sizes="specimenSrcSet ? '(min-width: 1280px) 16rem, (min-width: 1024px) 22vw, (min-width: 768px) 28vw, 100vw' : undefined"
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
