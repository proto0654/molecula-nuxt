import {
  prefersReducedMotion,
  subscribeReducedMotion,
} from '~/lib/a11y/reducedMotion';

/** Reactive `prefers-reduced-motion`. SSR defaults to reduced (no motion flash). */
export function useReducedMotion() {
  const reduced = ref(true);

  let stop: (() => void) | null = null;

  onMounted(() => {
    reduced.value = prefersReducedMotion();
    stop = subscribeReducedMotion((next) => {
      reduced.value = next;
    });
  });

  onBeforeUnmount(() => {
    stop?.();
    stop = null;
  });

  return reduced;
}
