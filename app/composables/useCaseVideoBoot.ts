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

  /** Returns true when videos were bound under `root`. */
  function tryInit(): boolean {
    teardown();

    if (!import.meta.client || !toValue(options.enabled)) return false;

    const el = toValue(options.root);
    if (!el) return false;

    dispose = initCaseVideos(el, {
      deferKickoff: !prefersReducedMotion(),
    });
    return true;
  }

  async function runKickoff(generation: number) {
    if (generation !== kickoffGeneration) return;
    if (!toValue(options.enabled) || !toValue(options.revealing)) return;
    if (!toValue(options.root)) return;

    if (!prefersReducedMotion()) {
      await doubleRaf();
    }

    if (generation !== kickoffGeneration) return;
    kickoffDeferredCaseVideos();
  }

  async function boot(generation: number) {
    if (!tryInit()) return;
    if (toValue(options.revealing)) {
      await runKickoff(generation);
    }
  }

  watch(
    () =>
      [
        toValue(options.enabled),
        toValue(options.root),
        toValue(options.revealing),
      ] as const,
    () => {
      kickoffGeneration += 1;
      const generation = kickoffGeneration;
      void nextTick(() => {
        void boot(generation);
      });
    },
    { immediate: true, flush: 'post' },
  );

  onBeforeRouteUpdate(() => {
    kickoffGeneration += 1;
    teardown();
    disposeAllCaseVideos();
  });

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
