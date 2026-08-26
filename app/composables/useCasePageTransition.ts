import type { MaybeRefOrGetter } from 'vue';

export type CaseBodyPhase = 'idle' | 'exiting' | 'hidden' | 'entering';

const EXIT_MS = 280;
const ACCENT_MS = 520;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * In-page case → case (and case leave) choreography.
 * Same [slug] component: delay the route until exit finishes, then reveal.
 * Accent of the new case is applied after reveal — not during exit.
 */
export function useCasePageTransition(options: {
  accentColor: MaybeRefOrGetter<string | null | undefined>;
  ready: MaybeRefOrGetter<boolean>;
}) {
  const phase = ref<CaseBodyPhase>('idle');
  const appliedAccent = ref<string | null>(null);
  let accentTimer: ReturnType<typeof setTimeout> | null = null;
  let exitPromise: Promise<void> | null = null;

  function clearAccentTimer() {
    if (accentTimer == null) return;
    clearTimeout(accentTimer);
    accentTimer = null;
  }

  function scheduleAccent() {
    clearAccentTimer();
    const color = toValue(options.accentColor) ?? null;
    // SSR and first client paint stay un-accented so hydration matches.
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

  function runExit(): Promise<void> {
    if (exitPromise) return exitPromise;

    exitPromise = (async () => {
      if (!import.meta.client || prefersReducedMotion()) {
        phase.value = 'hidden';
        return;
      }
      phase.value = 'exiting';
      await sleep(EXIT_MS);
      phase.value = 'hidden';
    })().finally(() => {
      exitPromise = null;
    });

    return exitPromise;
  }

  onBeforeRouteUpdate(async (to, from) => {
    if (String(to.params.slug || '') === String(from.params.slug || '')) return;
    await runExit();
  });

  onBeforeRouteLeave(async () => {
    await runExit();
  });

  watch(
    () => toValue(options.ready),
    (isReady) => {
      if (!isReady) return;

      if (phase.value === 'hidden' || phase.value === 'entering') {
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
        return;
      }

      if (phase.value === 'idle') {
        scheduleAccent();
      }
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    clearAccentTimer();
  });

  const bodyClass = computed(() =>
    phase.value === 'idle' ? undefined : `is-${phase.value}`,
  );

  return { phase, appliedAccent, bodyClass };
}
