<script setup lang="ts">
import type { Case } from '~/types/wp';
import { caseImageUrl, stripTags } from '~/domain/portfolio/presentation';

const props = defineProps<{
  caseData: Case;
  sectionIndex: number;
}>();

const root = ref<HTMLElement | null>(null);
const lightbox = useCaseLightbox();

useCaseScrollEntry({
  root,
  preset: 'slices',
});

function openMockup() {
  if (!props.caseData.mobile) return;
  lightbox.open(
    [
      {
        image: props.caseData.mobile.image,
        label: 'MOBILE / 01',
      },
    ],
    0,
  );
}
</script>

<template>
  <CaseSection v-if="caseData.mobile" :index="sectionIndex" label="Mobile">
    <div ref="root" class="case-mobile case-scroll-field">
      <div class="case-mobile__specimen">
        <div class="case-screen-card case-screen-card--mobile">
          <span class="case-scroll-trigger" aria-hidden="true" />
          <div
            class="case-scroll-motion case-scroll-motion--lag-even-mobile case-scroll-motion--lag-even-desktop"
          >
            <button
              type="button"
              class="case-screen-card__hit"
              aria-label="Open MOBILE / 01"
              @click="openMockup"
            >
              <span class="case-screen-card__meta">MOBILE / 01</span>
              <img
                class="case-screen-card__img case-screen-card__img--contain"
                :src="caseImageUrl(caseData.mobile.image)"
                :alt="caseData.mobile.image.alt || stripTags(caseData.title)"
                loading="lazy"
              />
            </button>
          </div>
        </div>
      </div>
      <div
        v-if="caseData.mobile.captionHtml"
        class="case-mobile__caption"
        v-html="caseData.mobile.captionHtml"
      />
    </div>
  </CaseSection>
</template>
