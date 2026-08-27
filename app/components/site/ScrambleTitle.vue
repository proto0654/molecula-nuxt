<script setup lang="ts">
import {
  scrambleText,
  charsetFromTarget,
  type ScrambleHandle,
} from '~/lib/hero-ui/textScramble';
import { prefersReducedMotion } from '~/lib/a11y/reducedMotion';

const props = withDefaults(
  defineProps<{
    text: string;
    as?: string;
    /**
     * Extra gate (e.g. case body idle after case→case exit).
     * Pose settle is always required via `useAwaitingPose`.
     */
    ready?: boolean;
  }>(),
  { as: 'h1', ready: true },
);

/** Uppercased for measure + scramble so line breaks stay locked like USP. */
const titleDisplay = computed(() => props.text.toLocaleUpperCase('ru-RU'));
const displayTitle = ref(titleDisplay.value);
const isVisible = ref(true);
const isScrambling = ref(false);
const awaitingPose = useAwaitingPose();

/** Last target we started (or finished) revealing — skip duplicate starts. */
let revealedTarget: string | null = null;
let handle: ScrambleHandle | null = null;

function cancelScramble() {
  handle?.cancel();
  handle = null;
}

function holdUntilReady() {
  cancelScramble();
  revealedTarget = null;
  displayTitle.value = '';
  isVisible.value = false;
  isScrambling.value = false;
}

function runScramble(target: string) {
  cancelScramble();
  revealedTarget = target;

  if (prefersReducedMotion()) {
    displayTitle.value = target;
    isVisible.value = true;
    isScrambling.value = false;
    return;
  }

  // Keep measure full; clear only the paint layer (absolute — no layout).
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

/** USP-style: arm while canvas settles; scramble only when pose + ready open. */
function tryReveal() {
  const target = titleDisplay.value;
  if (!import.meta.client) {
    displayTitle.value = target;
    isVisible.value = true;
    isScrambling.value = false;
    return;
  }

  if (!target) {
    holdUntilReady();
    return;
  }

  if (awaitingPose.value || !props.ready) {
    holdUntilReady();
    return;
  }

  if (revealedTarget === target && (isVisible.value || isScrambling.value)) {
    return;
  }

  runScramble(target);
}

onMounted(() => {
  tryReveal();
});

onBeforeUnmount(() => {
  cancelScramble();
});

watch(titleDisplay, () => {
  revealedTarget = null;
  tryReveal();
});

watch([awaitingPose, () => props.ready], () => {
  tryReveal();
});
</script>

<template>
  <component
    :is="as"
    class="scramble-title"
    :class="{
      'is-visible': isVisible,
      'is-scrambling': isScrambling,
    }"
    :aria-label="titleDisplay"
  >
    <span class="scramble-title__measure" aria-hidden="true">{{
      titleDisplay
    }}</span>
    <span class="scramble-title__display" aria-hidden="true">{{
      displayTitle
    }}</span>
  </component>
</template>
