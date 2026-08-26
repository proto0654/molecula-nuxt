<script setup lang="ts">
import type { Case } from '~/types/wp';
import { padCaseIndex, stripTags } from '~/domain/portfolio/presentation';
import {
  scrambleText,
  charsetFromTarget,
  type ScrambleHandle,
} from '~/lib/hero-ui/textScramble';

const props = withDefaults(
  defineProps<{
    caseData: Case;
    caseIndex?: number | null;
    showMeta?: boolean;
  }>(),
  { showMeta: true },
);

const titlePlain = computed(() => stripTags(props.caseData.title));
const displayTitle = ref(titlePlain.value);
const isVisible = ref(true);
const isScrambling = ref(false);

let handle: ScrambleHandle | null = null;

function cancelScramble() {
  handle?.cancel();
  handle = null;
}

function revealTitle() {
  cancelScramble();
  const target = titlePlain.value;
  if (!import.meta.client || !target) {
    displayTitle.value = target;
    isVisible.value = true;
    isScrambling.value = false;
    return;
  }

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  if (reducedMotion) {
    displayTitle.value = target;
    isVisible.value = true;
    isScrambling.value = false;
    return;
  }

  // Hide → fade + scramble (SSR / no-JS keep the full title visible).
  isVisible.value = false;
  displayTitle.value = '';
  isScrambling.value = true;

  requestAnimationFrame(() => {
    isVisible.value = true;
    handle = scrambleText(target, {
      duration: 1.05,
      reducedMotion: false,
      charset: charsetFromTarget(target),
      onFrame: (display) => {
        displayTitle.value = display;
      },
      onComplete: () => {
        isScrambling.value = false;
        handle = null;
      },
    });
  });
}

onMounted(() => {
  revealTitle();
});

onBeforeUnmount(() => {
  cancelScramble();
});

watch(titlePlain, () => {
  revealTitle();
});
</script>

<template>
  <header class="case-header">
    <p v-if="caseIndex" class="case-header__index">
      CASE / {{ padCaseIndex(caseIndex) }}
    </p>
    <h1
      class="case-header__title"
      :class="{
        'is-visible': isVisible,
        'is-scrambling': isScrambling,
      }"
      :aria-label="titlePlain"
    >
      <span class="case-header__title-measure" aria-hidden="true">{{
        titlePlain
      }}</span>
      <span class="case-header__title-display" aria-hidden="true">{{
        displayTitle
      }}</span>
    </h1>
    <p v-if="caseData.titleEn" class="case-header__descriptor">
      {{ caseData.titleEn }}
    </p>
    <div
      v-if="caseData.excerptHtml"
      class="case-header__intro"
      v-html="caseData.excerptHtml"
    />
    <CaseFacts v-if="showMeta" :case-data="caseData" />
  </header>
</template>
