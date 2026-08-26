<script setup lang="ts">
import type { Case } from '~/types/wp';
import {
  caseImageUrl,
  getCaseSliceLayout,
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
  preset: 'slices',
});

const layout = computed(() =>
  props.caseData.mobileSlices
    ? getCaseSliceLayout(props.caseData.mobileSlices)
    : null,
);

const imageUrl = computed(() => {
  const slices = props.caseData.mobileSlices;
  if (!slices) return '';
  return caseImageUrl(slices.image);
});

const gridStyle = computed(() => {
  const L = layout.value;
  if (!L) return undefined;
  return {
    '--slice-columns': String(L.columns),
    '--slice-rows': String(L.rows),
    '--slice-rows-mobile': String(L.rowsMobile),
    '--slice-aspect': L.aspectRatioCss,
    '--bg-image': `url(${JSON.stringify(imageUrl.value)})`,
  } as Record<string, string>;
});

function openFull() {
  const slices = props.caseData.mobileSlices;
  if (!slices) return;
  lightbox.open(
    [
      {
        image: slices.image,
        label: 'MOBILE / FULL',
      },
    ],
    0,
  );
}
</script>

<template>
  <CaseSection
    v-if="caseData.mobileSlices && layout"
    :index="sectionIndex"
    label="Slices"
    visual
  >
    <div
      ref="root"
      class="case-slices case-scroll-field"
      :class="{
        'case-slices--single': layout.total <= 1,
      }"
      :style="gridStyle"
    >
      <div
        v-for="cell in layout.cells"
        :key="cell.index"
        class="case-slices__cell"
        :class="{
          'case-slices__cell--stagger-desktop': cell.colOddDesktop,
          'case-slices__cell--stagger-mobile': cell.colOddMobile,
        }"
      >
        <div class="case-slices__stagger">
          <span class="case-scroll-trigger" aria-hidden="true" />
          <div
            class="case-scroll-motion"
            :class="{
              'case-scroll-motion--lag-odd-desktop': cell.colOddDesktop,
              'case-scroll-motion--lag-even-desktop': !cell.colOddDesktop,
              'case-scroll-motion--lag-odd-mobile': cell.colOddMobile,
              'case-scroll-motion--lag-even-mobile': !cell.colOddMobile,
            }"
          >
            <button
              type="button"
              class="case-slices__card"
              :style="{ '--bg-y': `${cell.bgY}%` }"
              :aria-label="`Open mobile screenshot, slice ${cell.label}`"
              @click="openFull"
            >
              <span class="case-slices__meta">{{ cell.label }}</span>
              <span
                class="case-slices__surface"
                role="img"
                :aria-label="
                  caseData.mobileSlices?.image.alt || stripTags(caseData.title)
                "
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </CaseSection>
</template>
