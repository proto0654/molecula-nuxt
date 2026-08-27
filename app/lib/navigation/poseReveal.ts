import { prefersReducedMotion } from '../a11y/reducedMotion';
import { atomIdForSpatialState } from '../spatial/spatialAtoms';
import { spatialFromRoute } from '../spatial/spatialFromRoute';

const SHELL_CLASS = 'is-awaiting-pose';

let awaiting = false;
const listeners = new Set<(next: boolean) => void>();

function syncDom(): void {
  if (typeof document === 'undefined') return;
  document.querySelector('.app-shell')?.classList.toggle(SHELL_CLASS, awaiting);
}

/** True while page overlay should stay invisible until the molecule pose settles. */
export function isAwaitingPose(): boolean {
  return awaiting;
}

export function setAwaitingPose(next: boolean): void {
  if (awaiting === next) return;
  awaiting = next;
  syncDom();
  for (const listener of listeners) {
    listener(next);
  }
}

export function subscribeAwaitingPose(
  listener: (next: boolean) => void,
): () => void {
  listeners.add(listener);
  listener(awaiting);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Arm the page veil before Vue paints the destination.
 * Initial load (`from.matched` empty) must not hide content — the hero may
 * not be mounted yet (ClientOnly).
 */
export function armPoseWaitForRoute(toPath: string, fromPath: string, fromMatched: number): void {
  if (fromMatched === 0) return;

  if (prefersReducedMotion()) {
    setAwaitingPose(false);
    return;
  }

  const toState = spatialFromRoute({ path: toPath });
  if (toState.mode === 'home') {
    setAwaitingPose(false);
    return;
  }

  const fromState = spatialFromRoute({ path: fromPath });
  const fromAtom = atomIdForSpatialState(fromState);
  const toAtom = atomIdForSpatialState(toState);
  if (fromState.mode === 'home' || fromAtom !== toAtom) {
    setAwaitingPose(true);
  }
}
