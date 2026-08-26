<script setup lang="ts">
import type { Case } from '~/types/wp';
import { caseImageUrl, stripTags } from '~/domain/portfolio/presentation';

defineProps<{
  caseData: Case;
  sectionIndex: number;
}>();

function itemClass(index: number, total: number): string {
  if (total === 1) return 'case-gallery__item case-gallery__item--wide';
  return index % 2 === 0
    ? 'case-gallery__item case-gallery__item--a'
    : 'case-gallery__item case-gallery__item--b';
}
</script>

<template>
  <CaseSection v-if="caseData.gallery.length" :index="sectionIndex" label="Screens">
    <ul class="case-gallery">
      <li
        v-for="(item, index) in caseData.gallery"
        :key="item.image.id + '-' + index"
        :class="itemClass(index, caseData.gallery.length)"
      >
        <img
          :src="caseImageUrl(item.image)"
          :alt="item.image.alt || `${stripTags(caseData.title)} ${index + 1}`"
          loading="lazy"
        />
      </li>
    </ul>
  </CaseSection>
</template>
