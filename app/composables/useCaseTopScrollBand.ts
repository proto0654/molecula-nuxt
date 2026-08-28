export const CASE_TOP_TOLERANCE = 2;

/** Read scroll position; swap for ScrollSmoother.scrollTop() when a proxy exists. */
export function getCaseScrollTop(): number {
  if (!import.meta.client) return 0;
  return window.scrollY ?? 0;
}

export function isCaseAtTop(): boolean {
  return getCaseScrollTop() <= CASE_TOP_TOLERANCE;
}

type TopBandListener = (atTop: boolean) => void;

const bandListeners = new Set<TopBandListener>();
let scrollListenerActive = false;

function notifyBandListeners() {
  const atTop = isCaseAtTop();
  for (const listener of bandListeners) {
    listener(atTop);
  }
}

function onBandScroll() {
  notifyBandListeners();
}

function ensureBandScrollListener() {
  if (!import.meta.client || scrollListenerActive) return;
  scrollListenerActive = true;
  window.addEventListener('scroll', onBandScroll, { passive: true });
}

function releaseBandScrollListener() {
  if (!import.meta.client || !scrollListenerActive || bandListeners.size > 0) return;
  scrollListenerActive = false;
  window.removeEventListener('scroll', onBandScroll);
}

/** Imperative subscribe for non-composable consumers (e.g. case video sync). */
export function subscribeCaseTopBand(listener: TopBandListener): () => void {
  bandListeners.add(listener);
  ensureBandScrollListener();
  listener(isCaseAtTop());

  return () => {
    bandListeners.delete(listener);
    releaseBandScrollListener();
  };
}

/** Reactive scrollTop ≤ 2 for Vue components (backdrop, etc.). */
export function useCaseTopScrollBand() {
  const atTop = ref(isCaseAtTop());

  let unsub: (() => void) | null = null;

  onMounted(() => {
    unsub = subscribeCaseTopBand((next) => {
      atTop.value = next;
    });
  });

  onScopeDispose(() => {
    unsub?.();
  });

  return {
    atTop: computed(() => atTop.value),
  };
}
