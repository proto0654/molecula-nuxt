import { prefersReducedMotion } from '~/lib/a11y/reducedMotion';
import { TransitionOverlay } from '~/lib/hero-ui/TransitionOverlay';

let overlay: TransitionOverlay | null = null;
let handedOff = false;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

const DISMISS_MS = 450;

function clearDismissTimer() {
  if (dismissTimer == null) return;
  clearTimeout(dismissTimer);
  dismissTimer = null;
}

/** Shared veil on `document.body` so it can survive hero unmount. */
export function acquireRouteVeil(): TransitionOverlay {
  if (typeof document === 'undefined') {
    throw new Error('Route veil is client-only');
  }
  clearDismissTimer();
  handedOff = false;
  if (!overlay) {
    overlay = new TransitionOverlay(document.body);
    overlay.root.classList.add('is-route-veil');
  }
  return overlay;
}

export function getRouteVeil(): TransitionOverlay | null {
  return overlay;
}

export function isRouteVeilHandedOff(): boolean {
  return handedOff;
}

/** Keep the veil at full opacity across the route hop. */
export function handoffRouteVeil(): void {
  handedOff = true;
  overlay?.setOpacity(1);
}

export function releaseRouteVeil(): void {
  if (handedOff) return;
  clearDismissTimer();
  overlay?.dispose();
  overlay = null;
}

/** Fade the handed-off veil out after the destination has mounted. */
export function dismissRouteVeil(): void {
  if (!overlay) return;
  const current = overlay;
  handedOff = false;

  if (prefersReducedMotion()) {
    current.dispose();
    if (overlay === current) overlay = null;
    return;
  }

  current.root.style.transition = `opacity ${DISMISS_MS}ms ease`;
  current.setOpacity(0);
  clearDismissTimer();
  dismissTimer = setTimeout(() => {
    dismissTimer = null;
    current.dispose();
    if (overlay === current) overlay = null;
  }, DISMISS_MS + 40);
}
