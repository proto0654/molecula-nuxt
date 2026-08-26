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
  /** True when `pointerup` already activated — skip the following synthetic click. */
  let handledByPointer = false;

  el.addEventListener('pointerdown', (event) => {
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    moved = false;
    handledByPointer = false;
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
    if (!moved) {
      handledByPointer = true;
      onTap();
    }
  });

  el.addEventListener('pointercancel', (event) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    moved = true;
    handledByPointer = false;
  });

  // Keyboard / synthetic click (no pointer gesture). After a real tap, skip
  // the browser's follow-up click so we do not fire twice.
  el.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (handledByPointer) {
      handledByPointer = false;
      return;
    }
    if (moved) {
      moved = false;
      return;
    }
    onTap();
  });
}
