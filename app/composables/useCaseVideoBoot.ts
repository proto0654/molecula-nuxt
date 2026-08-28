import type { MaybeRefOrGetter } from 'vue';
import { prefersReducedMotion } from '~/lib/a11y/reducedMotion';
import {
  disposeAllCaseVideos,
  initCaseVideos,
  kickoffDeferredCaseVideos,
} from '~/composables/useCaseVideos';

function doubleRaf(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * Case hero video boot: init scroll-gated playback, defer first play until after reveal.
 * Maps legacy bootAfterPageReveal → initCaseVideos + rAF kickoff.
 */
export function useCaseVideoBoot(options: {
  enabled: MaybeRefOrGetter<boolean>;
  revealing: MaybeRefOrGetter<boolean>;
  root: MaybeRefOrGetter<HTMLElement | null | undefined>;
}) {
  let dispose: (() => void) | null = null;
  let kickoffGeneration = 0;

  function teardown() {
    dispose?.();
    dispose = null;
  }

  function tryInit() {
    teardown();

    if (!import.meta.client || !toValue(options.enabled)) return;

    const el = toValue(options.root);
    if (!el) return;

    dispose = initCaseVideos(el, {
      deferKickoff: !prefersReducedMotion(),
    });
  }

  async function runKickoff(generation: number) {
    if (generation !== kickoffGeneration) return;
    if (!toValue(options.enabled) || !toValue(options.revealing)) return;

    if (!prefersReducedMotion()) {
      await doubleRaf();
    }

    if (generation !== kickoffGeneration) return;
    kickoffDeferredCaseVideos();
  }

  watch(
    () => [toValue(options.enabled), toValue(options.root)] as const,
    () => {
      kickoffGeneration += 1;
      tryInit();
    },
    { immediate: true },
  );

  watch(
    () => toValue(options.revealing) && toValue(options.enabled),
    (shouldKickoff) => {
      if (!shouldKickoff) return;
      const generation = kickoffGeneration;
      void runKickoff(generation);
    },
    { immediate: true },
  );

  onBeforeRouteLeave(() => {
    kickoffGeneration += 1;
    teardown();
    disposeAllCaseVideos();
  });

  onScopeDispose(() => {
    kickoffGeneration += 1;
    teardown();
  });
}
