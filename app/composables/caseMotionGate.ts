import type { ComputedRef, InjectionKey, MaybeRefOrGetter } from 'vue';

/** When false, case interactive listeners and RAF loops must idle. */
export const CASE_MOTION_GATE = Symbol('caseMotionGate') as InjectionKey<
  ComputedRef<boolean>
>;

export function provideCaseMotionGate(enabled: MaybeRefOrGetter<boolean>) {
  provide(CASE_MOTION_GATE, computed(() => toValue(enabled)));
}

export function useCaseMotionGate(): ComputedRef<boolean> {
  return inject(CASE_MOTION_GATE, computed(() => true));
}
