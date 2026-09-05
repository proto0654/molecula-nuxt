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

const layout = computed(() =>
  props.caseData.mobileSlices
    ? getCaseSliceLayout(props.caseData.mobileSlices)
    : null,
);

const { refresh: refreshScroll } = useCaseScrollEntry({
  root,
  preset: 'slices',
});

useCaseInteractive({
  root,
  mode: 'slice',
  revision: computed(() => props.caseData.mobileSlices?.image.id ?? 0),
});

const { update: updateBottomSpace } = useCaseSliceBottomSpace(root, {
  onUpdate: () => refreshScroll(),
});

watch(layout, async () => {
  await nextTick();
  updateBottomSpace();
});

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

function sliceColDesktop(index: number): number {
  const L = layout.value;
  if (!L) return 0;
  return Math.floor(index / L.rows);
}

function openFull() {
  const slices = props.caseData.mobileSlices;
  if (!slices) return;
  lightbox.open(
    [
      {
        image: slices.image,
        label: 'MOBILE / FULL',
        variant: 'mobile',
      },
    ],
    0,
  );
}

const slicesLabel = useUiString('case_section_slices');
</script>

<template>
  <CaseSection
    v-if="caseData.mobileSlices && layout"
    :index="sectionIndex"
    :label="slicesLabel"
    tone="visual"
    center
  >
    <div
      ref="root"
      class="case-slices case-scroll-field case-interactive case-interactive--slices"
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
        :data-case-col="String(sliceColDesktop(cell.index))"
      >
        <div class="case-slices__stagger">
          <span class="case-scroll-trigger" aria-hidden="true" />
          <div
            class="case-scroll-motion case-interactive__slice"
            :class="{
              'case-scroll-motion--lag-odd-desktop': cell.colOddDesktop,
              'case-scroll-motion--lag-even-desktop': !cell.colOddDesktop,
              'case-scroll-motion--lag-odd-mobile': cell.colOddMobile,
              'case-scroll-motion--lag-even-mobile': !cell.colOddMobile,
            }"
            :data-case-col="String(sliceColDesktop(cell.index))"
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
                class="case-slices__connector"
                :class="{
                  'case-slices__connector--desktop':
                    cell.index + layout.rows < layout.total,
                  'case-slices__connector--mobile':
                    cell.index + layout.rowsMobile < layout.total,
                }"
                aria-hidden="true"
              />
              <span
                class="case-slices__surface"
                role="img"
                :aria-label="
                  caseData.mobileSlices?.image.alt || stripTags(caseData.title)
                "
              />
              <span class="case-interactive__glare case-interactive__glare--slice" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </CaseSection>
</template>
