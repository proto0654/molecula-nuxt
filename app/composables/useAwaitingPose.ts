import {
  isAwaitingPose,
  subscribeAwaitingPose,
} from '~/lib/navigation/poseReveal';

/** Reactive shell veil: page overlay hidden until the molecule pose settles. */
export function useAwaitingPose() {
  const awaitingPose = shallowRef(
    import.meta.client ? isAwaitingPose() : false,
  );

  let stop: (() => void) | null = null;

  onMounted(() => {
    awaitingPose.value = isAwaitingPose();
    stop = subscribeAwaitingPose((next) => {
      awaitingPose.value = next;
    });
  });

  onBeforeUnmount(() => {
    stop?.();
    stop = null;
  });

  return awaitingPose;
}
