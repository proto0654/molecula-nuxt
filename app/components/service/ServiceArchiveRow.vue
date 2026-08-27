<script setup lang="ts">
import type { ServiceArchiveEntry } from '~/domain/services/archive';
import {
  serviceArchiveMetaLabel,
  serviceArchiveSpecimenImage,
  serviceArchiveSpecimenUrl,
  serviceArchiveTitlePlain,
} from '~/domain/services/archive';
import { padCaseIndex } from '~/domain/portfolio/presentation';
import { saveArchiveReturn } from '~/lib/navigation/archiveReturn';

const props = defineProps<{
  entry: ServiceArchiveEntry;
  page: number;
  eager?: boolean;
}>();

const item = computed(() => props.entry.item);
const title = computed(() => serviceArchiveTitlePlain(item.value));
const meta = computed(() => serviceArchiveMetaLabel(item.value));
const specimen = computed(() => serviceArchiveSpecimenImage(item.value));
const specimenUrl = computed(() => serviceArchiveSpecimenUrl(item.value));
const href = computed(() => `/services/${item.value.slug}`);

function onNavigate() {
  saveArchiveReturn(
    {
      page: props.page,
      slug: item.value.slug,
      y: window.scrollY,
    },
    'services',
  );
}
</script>

<template>
  <li class="archive-row" :data-slug="item.slug">
    <NuxtLink :to="href" class="archive-row__link" @click="onNavigate">
      <span class="archive-row__index">{{ padCaseIndex(entry.index) }}</span>
      <span class="archive-row__copy">
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
