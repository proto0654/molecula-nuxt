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
  preset: 'lift',
});

useCaseInteractive({
  root,
  mode: 'device',
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
  <CaseSection
    v-if="caseData.mobile"
    :index="sectionIndex"
    label="Mobile"
    tone="quiet"
  >
    <div ref="root" class="case-mobile case-scroll-field case-interactive case-interactive--device">
      <div class="case-mobile__mockup">
        <span class="case-scroll-trigger" aria-hidden="true" />
        <div class="case-scroll-motion">
          <button
            type="button"
            class="case-mobile__button"
            aria-label="Open MOBILE / 01"
            @click="openMockup"
          >
            <span class="case-mobile__meta">MOBILE / 01</span>
            <div class="case-interactive__tilt case-mobile__device">
              <img
                class="case-mobile__img"
                :src="caseImageUrl(caseData.mobile.image)"
                :alt="caseData.mobile.image.alt || stripTags(caseData.title)"
                loading="lazy"
              />
              <span class="case-interactive__glare case-interactive__glare--device" aria-hidden="true" />
              <span class="case-mobile__shadow" aria-hidden="true" />
            </div>
          </button>
        </div>
      </div>
      <div
        v-if="caseData.mobileSignatureHtml"
        class="case-mobile__caption"
        v-html="caseData.mobileSignatureHtml"
      />
    </div>
  </CaseSection>
</template>
