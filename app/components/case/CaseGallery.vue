<script setup lang="ts">
import type { Case } from '~/types/wp';
import {
  CASE_LANDING_SIZES,
  CASE_SCREEN_SIZES,
  balanceCaseScreenColumns,
  caseImageUrl,
  getCaseScreenItems,
  isCaseScreensLandingOnly,
  padCaseIndex,
  stripTags,
} from '~/domain/portfolio/presentation';
import type { CaseLightboxItem } from '~/composables/useCaseLightbox';

const props = defineProps<{
  caseData: Case;
  sectionIndex: number;
}>();

const root = ref<HTMLElement | null>(null);
const lightbox = useCaseLightbox();

const items = computed(() => getCaseScreenItems(props.caseData));
const landingOnly = computed(() => isCaseScreensLandingOnly(props.caseData));
const scrollPreset = computed(() =>
  landingOnly.value ? 'landingOnly' : 'screensGrid',
);

useCaseScrollEntry({ root, preset: scrollPreset });

useCaseInteractive({
  root,
  mode: 'landing',
  enabled: computed(() => landingOnly.value),
});

const lightboxItems = computed<CaseLightboxItem[]>(() =>
  items.value.map((item, index) => ({
    image: item.image,
    label:
      item.source === 'landing'
        ? 'LANDING / 01'
        : `SCREEN / ${padCaseIndex(index + 1)}`,
  })),
);

const columns = computed(() => balanceCaseScreenColumns(items.value));

function openAt(index: number) {
  lightbox.open(lightboxItems.value, index);
}

function itemSrc(item: (typeof items.value)[number]) {
  return caseImageUrl(
    item.image,
    item.source === 'landing' ? CASE_LANDING_SIZES : CASE_SCREEN_SIZES,
  );
}

function itemAlt(item: (typeof items.value)[number], index: number) {
  return item.image.alt || `${stripTags(props.caseData.title)} ${index + 1}`;
}

function aspectStyle(item: (typeof items.value)[number]) {
  const w = item.image.width;
  const h = item.image.height;
  if (w && h && w > 0 && h > 0) {
    return { aspectRatio: `${w} / ${h}` };
  }
  return undefined;
}

function labelFor(index: number): string {
  return lightboxItems.value[index]?.label ?? `SCREEN / ${padCaseIndex(index + 1)}`;
}

function mobileColFor(index: number): number {
  return index % 2;
}

const interfaceLabel = useUiString('case_section_interface');
</script>

<template>
  <CaseSection
    v-if="items.length"
    :index="sectionIndex"
    :label="interfaceLabel"
    tone="visual"
    center
  >
    <div
      ref="root"
      class="case-inner-pages case-interactive"
      :class="{
        'case-inner-pages--landing-only': landingOnly,
        'case-interactive case-interactive--landing': landingOnly,
      }"
    >
      <div class="case-inner-pages__stage case-inner-pages__stage--mobile">
        <div
          v-for="(item, index) in items"
          :key="'m-' + item.image.id + '-' + index"
          class="case-inner-pages__card-wrapper"
          :data-case-col="String(mobileColFor(index))"
        >
          <div
            class="case-inner-pages__card-motion case-scroll-motion"
            :data-case-col="String(mobileColFor(index))"
          >
            <button
              type="button"
              class="case-inner-pages__card-button"
              :aria-label="`Open ${labelFor(index)}`"
              @click="openAt(index)"
            >
              <span class="case-inner-pages__meta">{{ labelFor(index) }}</span>
              <div v-if="landingOnly" class="case-interactive__tilt">
                <figure class="case-inner-pages__card" :style="aspectStyle(item)">
                  <img
                    :src="itemSrc(item)"
                    :alt="itemAlt(item, index)"
                    :loading="landingOnly || index === 0 ? 'eager' : 'lazy'"
                    :fetchpriority="landingOnly || index === 0 ? 'high' : undefined"
                  />
                  <span class="case-interactive__glare" aria-hidden="true" />
                </figure>
              </div>
              <figure
                v-else
                class="case-inner-pages__card"
                :style="aspectStyle(item)"
              >
                <img
                  :src="itemSrc(item)"
                  :alt="itemAlt(item, index)"
                  :loading="index === 0 ? 'eager' : 'lazy'"
                  :fetchpriority="index === 0 ? 'high' : undefined"
                />
              </figure>
            </button>
          </div>
          <span class="case-inner-pages__trigger case-scroll-trigger" aria-hidden="true" />
        </div>
      </div>

      <div class="case-inner-pages__stage case-inner-pages__stage--desktop">
        <div
          v-for="(colItems, col) in columns"
          :key="'col-' + col"
          class="case-inner-pages__column"
          :data-case-col="String(col)"
        >
          <div
            v-for="(placed, row) in colItems"
            :key="'d-' + placed.item.image.id + '-' + col + '-' + row"
            class="case-inner-pages__card-wrapper"
            :class="{
              [`case-inner-pages__card-wrapper--stair-${col}`]:
                !landingOnly && row === 0 && col < 2,
            }"
            :data-case-col="String(col)"
          >
            <div
              class="case-inner-pages__card-motion case-scroll-motion"
              :data-case-col="String(col)"
            >
              <button
                type="button"
                class="case-inner-pages__card-button"
                :aria-label="`Open ${labelFor(placed.index)}`"
                @click="openAt(placed.index)"
              >
                <span class="case-inner-pages__meta">{{
                  labelFor(placed.index)
                }}</span>
                <div v-if="landingOnly" class="case-interactive__tilt">
                  <figure
                    class="case-inner-pages__card"
                    :style="aspectStyle(placed.item)"
                  >
                    <img
                      :src="itemSrc(placed.item)"
                      :alt="itemAlt(placed.item, placed.index)"
                      loading="eager"
                      fetchpriority="high"
                    />
                    <span class="case-interactive__glare" aria-hidden="true" />
                  </figure>
                </div>
                <figure
                  v-else
                  class="case-inner-pages__card"
                  :style="aspectStyle(placed.item)"
                >
                  <img
                    :src="itemSrc(placed.item)"
                    :alt="itemAlt(placed.item, placed.index)"
                    :loading="placed.index === 0 ? 'eager' : 'lazy'"
                    :fetchpriority="placed.index === 0 ? 'high' : undefined"
                  />
                </figure>
              </button>
            </div>
            <span
              class="case-inner-pages__trigger case-scroll-trigger"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </div>
  </CaseSection>
</template>
