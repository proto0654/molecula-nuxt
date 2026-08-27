import { prefersReducedMotion } from '~/lib/a11y/reducedMotion';

/**
 * Drive archive/section body enter after the molecule pose veil lifts.
 * Pairs with `.archive-page.is-revealing` and SiteScrambleTitle pose gate.
 */
export function usePageContentReveal() {
  const awaitingPose = useAwaitingPose();
  const revealing = ref(false);
  let started = false;

  function startReveal() {
    if (started || awaitingPose.value) return;
    started = true;
    revealing.value = true;
  }

  onMounted(() => {
    document.documentElement.classList.add('js-enabled');

    if (prefersReducedMotion()) {
      started = true;
      revealing.value = true;
      return;
    }
    startReveal();
  });

  watch(awaitingPose, (next) => {
    if (!next) startReveal();
  });

  return { revealing, awaitingPose };
}
