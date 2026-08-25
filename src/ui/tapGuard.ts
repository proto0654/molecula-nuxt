const DEFAULT_THRESHOLD_PX = 10;

/** Suppress activation when the pointer moved past the tap threshold (scroll-drag). */
export function attachTapGuard(
  el: HTMLElement,
  onTap: () => void,
  thresholdPx = DEFAULT_THRESHOLD_PX,
): void {
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let moved = false;

  el.addEventListener('pointerdown', (event) => {
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    moved = false;
  });

  el.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    if (
      Math.hypot(event.clientX - startX, event.clientY - startY) >= thresholdPx
    ) {
      moved = true;
    }
  });

  el.addEventListener('pointerup', (event) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    if (!moved) onTap();
  });

  el.addEventListener('pointercancel', (event) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    moved = true;
  });

  // Prevent native click after a drag; tap already handled on pointerup.
  el.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
}
