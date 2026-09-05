<script setup lang="ts">
import type { Case } from '~/types/wp';
import {
  caseImageSrcSet,
  caseImageUrl,
  stripTags,
} from '~/domain/portfolio/presentation';

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
  revision: computed(() => props.caseData.mobile?.image.id ?? 0),
});

const mobileSrc = computed(() =>
  props.caseData.mobile
    ? caseImageUrl(props.caseData.mobile.image)
    : null,
);

const mobileSrcSet = computed(() =>
  props.caseData.mobile
    ? caseImageSrcSet(props.caseData.mobile.image)
    : null,
);

function openMockup() {
  if (!props.caseData.mobile) return;
  lightbox.open(
    [
      {
        image: props.caseData.mobile.image,
        label: 'MOBILE / 01',
        variant: 'mobile',
      },
    ],
    0,
  );
}

const mobileLabel = useUiString('case_section_mobile');
</script>

<template>
  <CaseSection
    v-if="caseData.mobile"
    :index="sectionIndex"
    :label="mobileLabel"
    tone="visual"
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
                :src="mobileSrc!"
                :srcset="mobileSrcSet ?? undefined"
                :sizes="
                  mobileSrcSet
                    ? '(min-width: 1024px) 18rem, min(60vw, 16rem)'
                    : undefined
                "
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
