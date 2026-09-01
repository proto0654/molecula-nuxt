import type { MaybeRefOrGetter } from 'vue';
import {
  playEntityLightSweep,
  type EntityLightSweepDirection,
} from '~/composables/useMoleculeCue';
import { takeFlipSweepDirection } from '~/lib/molecular/moleculeFlipIntent';
import { prefersReducedMotion } from '~/lib/a11y/reducedMotion';
export type CaseBodyPhase = 'idle' | 'exiting' | 'hidden' | 'entering';

const EXIT_MS = 280;
const ACCENT_MS = 520;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function normalizeRouteSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function readRouteFlipSweep(
  to: { state?: unknown },
): EntityLightSweepDirection | null {
  const raw = (to.state as { flipSweep?: unknown } | undefined)?.flipSweep;
  return raw === -1 || raw === 1 ? raw : null;
}

/** Prev = L→R (−1), next = R→L (1). Uses production order from slim index. */
export function resolveAdjacentFlipDirection(
  fromSlug: string,
  toSlug: string,
  positionFor: (from: string) => {
    prev: { slug: string } | null;
    next: { slug: string } | null;
  },
): EntityLightSweepDirection {
  const from = normalizeRouteSlug(fromSlug);
  const to = normalizeRouteSlug(toSlug);
  const pos = positionFor(from);
  if (pos.prev && normalizeRouteSlug(pos.prev.slug) === to) return -1;
  if (pos.next && normalizeRouteSlug(pos.next.slug) === to) return 1;
  return 1;
}

/**
 * In-page case → case (and case leave) choreography.
 * Exit veil runs in parallel with the route swap + data fetch — navigation is not
 * blocked. Enter/reveal starts as soon as `ready`; body fade only gates visibility.
 */
export function useCasePageTransition(options: {
  accentColor: MaybeRefOrGetter<string | null | undefined>;
  ready: MaybeRefOrGetter<boolean>;
  /** Map prev/next slug flip to sweep direction (default: next = R→L). */
  resolveFlipDirection?: (
    fromSlug: string,
    toSlug: string,
  ) => EntityLightSweepDirection;
}) {
  const phase = ref<CaseBodyPhase>('idle');
  const appliedAccent = ref<string | null>(null);
  let accentTimer: ReturnType<typeof setTimeout> | null = null;
  let exitPromise: Promise<void> | null = null;
  let pendingEnter = false;

  function clearAccentTimer() {
    if (accentTimer == null) return;
    clearTimeout(accentTimer);
    accentTimer = null;
  }

  function scheduleAccent() {
    clearAccentTimer();
    const color = toValue(options.accentColor) ?? null;
    if (!import.meta.client) return;
    if (prefersReducedMotion()) {
      appliedAccent.value = color;
      return;
    }
    accentTimer = setTimeout(() => {
      appliedAccent.value = color;
      accentTimer = null;
    }, ACCENT_MS);
  }

  function beginEnter(): void {
    pendingEnter = false;
    if (phase.value === 'idle') {
      scheduleAccent();
      return;
    }
    phase.value = 'entering';
    if (import.meta.client) {
      window.scrollTo(0, 0);
    }
    nextTick(() => {
      requestAnimationFrame(() => {
        phase.value = 'idle';
        scheduleAccent();
      });
    });
  }

  function tryFinishEnter(): void {
    if (!toValue(options.ready)) {
      pendingEnter = true;
      return;
    }
    if (phase.value === 'hidden') {
      beginEnter();
    }
  }

  function runExit(options: { lightSweep?: boolean; sweepDirection?: EntityLightSweepDirection } = {}): void {
    if (options.lightSweep) {
      playEntityLightSweep(options.sweepDirection ?? 1);
    }
    if (exitPromise) return;

    exitPromise = (async () => {
      if (!import.meta.client || prefersReducedMotion()) {
        phase.value = 'hidden';
        tryFinishEnter();
        return;
      }
      phase.value = 'exiting';
      await sleep(EXIT_MS);
      phase.value = 'hidden';
      tryFinishEnter();
    })().finally(() => {
      exitPromise = null;
    });
  }

  onBeforeRouteUpdate((to, from) => {
    const fromSlug = String(from.params.slug || '');
    const toSlug = String(to.params.slug || '');
    if (fromSlug === toSlug) return;
    const sweepDirection =
      takeFlipSweepDirection() ??
      readRouteFlipSweep(to) ??
      options.resolveFlipDirection?.(fromSlug, toSlug) ??
      1;
    runExit({ lightSweep: true, sweepDirection });
  });

  onBeforeRouteLeave(() => {
    runExit();
  });

  watch(
    () => toValue(options.ready),
    (isReady) => {
      if (!isReady) return;

      if (phase.value === 'exiting') {
        pendingEnter = true;
        return;
      }

      if (phase.value === 'hidden' || phase.value === 'entering') {
        beginEnter();
        return;
      }

      if (phase.value === 'idle') {
        scheduleAccent();
      }
    },
    { immediate: true },
  );

  watch(phase, (next) => {
    if (next === 'hidden' && pendingEnter && toValue(options.ready)) {
      beginEnter();
    }
  });

  onBeforeUnmount(() => {
    clearAccentTimer();
  });

  const bodyClass = computed(() =>
    phase.value === 'idle' ? undefined : `is-${phase.value}`,
  );

  /** Content reveal / motion may start while the exit veil is still up. */
  const contentRevealReady = computed(() => toValue(options.ready));

  return { phase, appliedAccent, bodyClass, contentRevealReady };
}
