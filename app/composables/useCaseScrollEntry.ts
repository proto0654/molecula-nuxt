import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { MaybeRefOrGetter } from 'vue';

/**
 * Scroll entry presets matching PHP weblaba-case-scroll-effects.
 * - screensGrid: rotateY 72→0 (inner-pages pack)
 * - landingOnly: rotateX 82→0 + translateZ −125 (solo landing)
 * - slices: multi-stop rotateX + Z + Y lag
 */
export type CaseScrollPreset = 'screensGrid' | 'landingOnly' | 'slices';

export type CaseScrollEntryOptions = {
  root: Ref<HTMLElement | null>;
  preset?: MaybeRefOrGetter<CaseScrollPreset>;
  triggerSelector?: string;
  motionSelector?: string;
  start?: string;
  end?: string;
};

type EntryPair = {
  trigger: HTMLElement;
  motion: HTMLElement;
};

const ENTRY_START = 'top bottom+=12%';
const ENTRY_END = 'top 30%';

const SLICE_STOPS = [
  { t: 0, opacity: 0, rotateX: 72, yMul: 1, z: -120 },
  { t: 0.12, opacity: 0.5, rotateX: 68, yMul: 0.94, z: -108 },
  { t: 0.28, opacity: 0.78, rotateX: 58, yMul: 0.76, z: -82 },
  { t: 0.45, opacity: 0.95, rotateX: 40, yMul: 0.48, z: -48 },
  { t: 0.62, opacity: 1, rotateX: 20, yMul: 0.22, z: -18 },
  { t: 0.78, opacity: 1, rotateX: 7, yMul: 0.07, z: -5 },
  { t: 0.92, opacity: 1, rotateX: 2, yMul: 0.015, z: -1 },
  { t: 1, opacity: 1, rotateX: 0, yMul: 0, z: 0 },
] as const;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function collectPairs(
  scope: HTMLElement,
  triggerSelector: string,
  motionSelector: string,
): EntryPair[] {
  const triggers = scope.querySelectorAll<HTMLElement>(triggerSelector);
  const pairs: EntryPair[] = [];
  for (const trigger of triggers) {
    const parent = trigger.parentElement;
    if (!parent) continue;
    const motion = parent.querySelector<HTMLElement>(motionSelector);
    if (!motion) continue;
    pairs.push({ trigger, motion });
  }
  return pairs;
}

/** Resolve visible inner-pages stage (mobile vs desktop) so hidden probes are ignored. */
function resolveScope(root: HTMLElement): HTMLElement {
  const desktop = root.querySelector<HTMLElement>('.case-inner-pages__stage--desktop');
  const mobile = root.querySelector<HTMLElement>('.case-inner-pages__stage--mobile');
  if (desktop && mobile) {
    const wide = window.matchMedia('(min-width: 1024px)').matches;
    return wide ? desktop : mobile;
  }
  return root;
}

function parseLagPx(motion: HTMLElement): number {
  const raw =
    getComputedStyle(motion).getPropertyValue('--case-scroll-lag').trim() ||
    '0px';
  const probe = document.createElement('div');
  probe.style.cssText = `position:absolute;visibility:hidden;height:${raw}`;
  document.body.appendChild(probe);
  const px = probe.offsetHeight;
  probe.remove();
  return px;
}

function buildSliceTimeline(motion: HTMLElement, lagPx: number): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });
  const from = SLICE_STOPS[0]!;
  gsap.set(motion, {
    opacity: from.opacity,
    rotateX: from.rotateX,
    z: from.z,
    y: from.yMul * lagPx,
    transformOrigin: 'center bottom',
    force3D: true,
  });

  for (let i = 1; i < SLICE_STOPS.length; i += 1) {
    const prev = SLICE_STOPS[i - 1]!;
    const stop = SLICE_STOPS[i]!;
    const duration = stop.t - prev.t;
    tl.to(
      motion,
      {
        opacity: stop.opacity,
        rotateX: stop.rotateX,
        z: stop.z,
        y: stop.yMul * lagPx,
        duration,
        ease: 'none',
      },
      prev.t,
    );
  }
  return tl;
}

export function useCaseScrollEntry(options: CaseScrollEntryOptions) {
  const triggerSelector = options.triggerSelector ?? '.case-scroll-trigger';
  const motionSelector = options.motionSelector ?? '.case-scroll-motion';
  const start = options.start ?? ENTRY_START;
  const end = options.end ?? ENTRY_END;
  const { root } = options;
  const presetRef = computed(() => toValue(options.preset) ?? 'screensGrid');

  let triggers: ScrollTrigger[] = [];
  let loadHandlers: Array<{ img: HTMLImageElement; fn: () => void }> = [];
  let registered = false;
  let mq: MediaQueryList | null = null;

  function kill() {
    for (const t of triggers) t.kill();
    triggers = [];
    for (const { img, fn } of loadHandlers) {
      img.removeEventListener('load', fn);
    }
    loadHandlers = [];
  }

  function refresh() {
    if (import.meta.client && registered) ScrollTrigger.refresh();
  }

  function bindImageLoads(el: HTMLElement) {
    const imgs = el.querySelectorAll('img');
    for (const img of imgs) {
      if (img.complete) continue;
      const fn = () => refresh();
      img.addEventListener('load', fn, { once: true });
      loadHandlers.push({ img, fn });
    }
  }

  function init() {
    kill();
    const el = root.value;
    if (!el || !import.meta.client) return;

    document.documentElement.classList.add('js-enabled');

    if (prefersReducedMotion()) return;

    if (!registered) {
      gsap.registerPlugin(ScrollTrigger);
      registered = true;
    }

    const scope = resolveScope(el);
    bindImageLoads(scope);
    const pairs = collectPairs(scope, triggerSelector, motionSelector);
    const preset = presetRef.value;

    for (const { trigger, motion } of pairs) {
      if (preset === 'slices') {
        const lagPx = parseLagPx(motion);
        const tl = buildSliceTimeline(motion, lagPx);
        triggers.push(
          ScrollTrigger.create({
            trigger,
            start,
            end,
            scrub: true,
            animation: tl,
          }),
        );
        continue;
      }

      if (preset === 'landingOnly') {
        gsap.set(motion, {
          opacity: 0,
          rotateX: 82,
          rotateY: 0,
          z: -125,
          y: 0,
          transformOrigin: 'center center',
          force3D: true,
        });
        const tween = gsap.to(motion, {
          opacity: 1,
          rotateX: 0,
          z: 0,
          ease: 'power2.out',
          scrollTrigger: { trigger, start, end, scrub: true },
        });
        if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
        continue;
      }

      gsap.set(motion, {
        opacity: 0,
        rotateX: 0,
        rotateY: 72,
        z: 0,
        y: 0,
        transformOrigin: 'center center',
        force3D: true,
      });
      const tween = gsap.to(motion, {
        opacity: 1,
        rotateY: 0,
        ease: 'none',
        scrollTrigger: { trigger, start, end, scrub: true },
      });
      if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
    }
  }

  function onMqChange() {
    nextTick(() => init());
  }

  onMounted(() => {
    if (import.meta.client) {
      mq = window.matchMedia('(min-width: 1024px)');
      mq.addEventListener('change', onMqChange);
    }
    nextTick(() => init());
  });

  onBeforeUnmount(() => {
    mq?.removeEventListener('change', onMqChange);
    kill();
  });

  watch([root, presetRef], () => {
    nextTick(() => init());
  });

  return { refresh: init, kill };
}
