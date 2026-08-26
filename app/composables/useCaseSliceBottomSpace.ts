import type { Ref } from 'vue';

type Options = {
  onUpdate?: () => void;
};

const SCROLL_END_VIEWPORT = 0.3;

/**
 * Bottom padding for `.case-slices`:
 * - `stagger` — brick offset is transform-only (must exist in layout)
 * - `runway` — only when document is too short for the last trigger to reach
 *   ScrollTrigger end (`top 30%`): max(0, triggerTop + 0.70·vh − scrollHeight)
 */
export function useCaseSliceBottomSpace(
  root: Ref<HTMLElement | null>,
  options: Options = {},
) {
  let ro: ResizeObserver | null = null;

  function parseCssLength(raw: string, ctx: HTMLElement): number {
    const value = raw.trim();
    if (!value) return 0;
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;height:${value}`;
    ctx.appendChild(probe);
    const px = probe.offsetHeight;
    probe.remove();
    return px;
  }

  function lastTriggerDocTop(el: HTMLElement): number {
    const triggers = el.querySelectorAll<HTMLElement>('.case-scroll-trigger');
    let maxT = 0;
    for (const trigger of triggers) {
      const top = trigger.getBoundingClientRect().top + window.scrollY;
      maxT = Math.max(maxT, top);
    }
    return maxT;
  }

  function scrollDeficit(el: HTMLElement, vh: number): number {
    const triggerTop = lastTriggerDocTop(el);
    if (triggerTop <= 0) return 0;
    const needed = triggerTop + (1 - SCROLL_END_VIEWPORT) * vh;
    return needed - document.documentElement.scrollHeight;
  }

  function applyPadding(el: HTMLElement, stagger: number, deficit: number): string {
    const pad = Math.round(stagger + Math.max(0, deficit));
    return `${pad}px`;
  }

  function update() {
    const el = root.value;
    if (!el || !import.meta.client) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      el.style.setProperty('--slice-bottom-space', '0px');
      options.onUpdate?.();
      return;
    }

    const cs = getComputedStyle(el);
    const rootCs = getComputedStyle(document.documentElement);
    const stagger = parseCssLength(
      cs.getPropertyValue('--slice-col-stagger') ||
        rootCs.getPropertyValue('--slice-col-stagger'),
      el,
    );
    const vh = window.innerHeight;

    // Pass 1: measure deficit with stagger-only padding (avoid circular overshoot).
    el.style.setProperty('--slice-bottom-space', `${Math.round(stagger)}px`);
    void el.offsetHeight;

    let deficit = scrollDeficit(el, vh);
    let next = applyPadding(el, stagger, deficit);

    // Pass 2: one correction after padding affects scrollHeight.
    if (deficit > 0) {
      el.style.setProperty('--slice-bottom-space', next);
      void el.offsetHeight;
      deficit = scrollDeficit(el, vh);
      next = applyPadding(el, stagger, deficit);
    }

    if (el.style.getPropertyValue('--slice-bottom-space') === next) return;
    el.style.setProperty('--slice-bottom-space', next);
    options.onUpdate?.();
  }

  onMounted(() => {
    if (!import.meta.client) return;
    nextTick(() => {
      update();
      const el = root.value;
      if (!el || typeof ResizeObserver === 'undefined') return;
      ro = new ResizeObserver(() => update());
      ro.observe(el);
      window.addEventListener('resize', update, { passive: true });
    });
  });

  onBeforeUnmount(() => {
    ro?.disconnect();
    ro = null;
    if (import.meta.client) {
      window.removeEventListener('resize', update);
    }
  });

  watch(root, () => nextTick(update));

  return { update };
}
