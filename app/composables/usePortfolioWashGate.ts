import { prefersReducedMotion } from '~/lib/a11y/reducedMotion';
import { isPortfolioPath } from '~/composables/usePortfolioBackdrop';

/** Hold after pose settle, then CSS does a long soft fade-in. */
const WASH_ENTRANCE_DELAY_MS = 700;

let wired = false;
let timer: ReturnType<typeof setTimeout> | null = null;

function clearTimer() {
  if (timer == null) return;
  clearTimeout(timer);
  timer = null;
}

/**
 * Soft-gate portfolio featured washes when arriving from outside `/portfolio*`
 * (home / sections — pose wait armed). Archive↔case stays immediate.
 * Shared `useState` — wire once from any caller (layout + archive).
 */
export function usePortfolioWashGate() {
  const route = useRoute();
  const awaitingPose = useAwaitingPose();
  const washesReady = useState('portfolio-washes-ready', () => false);
  const needsEntrance = useState('portfolio-washes-entrance', () => false);

  function openNow() {
    clearTimer();
    washesReady.value = true;
  }

  function arm() {
    if (!import.meta.client) return;
    if (!isPortfolioPath(route.path)) {
      washesReady.value = false;
      needsEntrance.value = false;
      clearTimer();
      return;
    }
    if (awaitingPose.value) return;

    if (prefersReducedMotion()) {
      openNow();
      return;
    }

    if (!needsEntrance.value) {
      openNow();
      return;
    }

    if (washesReady.value) return;

    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      needsEntrance.value = false;
      washesReady.value = true;
    }, WASH_ENTRANCE_DELAY_MS);
  }

  function wire() {
    if (wired) {
      arm();
      return;
    }
    wired = true;

    if (awaitingPose.value) {
      needsEntrance.value = true;
      washesReady.value = false;
    }

    arm();

    watch(awaitingPose, (waiting) => {
      if (waiting) {
        needsEntrance.value = true;
        washesReady.value = false;
        clearTimer();
        return;
      }
      arm();
    });

    watch(
      () => route.path,
      (path, prev) => {
        if (!isPortfolioPath(path)) {
          washesReady.value = false;
          needsEntrance.value = false;
          clearTimer();
          return;
        }
        const fromOutside = !prev || !isPortfolioPath(prev);
        if (fromOutside && !awaitingPose.value) {
          needsEntrance.value = true;
          washesReady.value = false;
        }
        arm();
      },
    );
  }

  if (import.meta.client) {
    onMounted(wire);
  }

  return { washesReady: readonly(washesReady) };
}
