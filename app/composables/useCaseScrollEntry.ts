import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { MaybeRefOrGetter } from 'vue';
import { prefersReducedMotion } from '~/lib/a11y/reducedMotion';
import {
  isAwaitingPose,
  subscribeAwaitingPose,
} from '~/lib/navigation/poseReveal';
import { useCaseMotionGate } from '~/composables/caseMotionGate';

/**
 * Scroll entry presets.
 * L1 fade: opacity + translateY (editorial)
 * L2 lift: small perspective / scale (mobile mockup)
 * L3: gallery / slices 3D only
 */
export type CaseScrollPreset =
  | 'fade'
  | 'lift'
  | 'screensGrid'
  | 'landingOnly'
  | 'slices';

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
  { t: 0, opacity: 0, rotateX: 72, rotateY: 0, yMul: 1, z: -120, scale: 0.96 },
  { t: 0.12, opacity: 0.5, rotateX: 68, rotateY: 0, yMul: 0.94, z: -108, scale: 0.97 },
  { t: 0.28, opacity: 0.78, rotateX: 58, rotateY: 0, yMul: 0.76, z: -82, scale: 0.98 },
  { t: 0.45, opacity: 0.95, rotateX: 40, rotateY: 0, yMul: 0.48, z: -48, scale: 0.99 },
  { t: 0.62, opacity: 1, rotateX: 20, rotateY: 0, yMul: 0.22, z: -18, scale: 1 },
  { t: 0.78, opacity: 1, rotateX: 7, rotateY: 0, yMul: 0.07, z: -5, scale: 1 },
  { t: 0.92, opacity: 1, rotateX: 2, rotateY: 0, yMul: 0.015, z: -1, scale: 1 },
  { t: 1, opacity: 1, rotateX: 0, rotateY: 0, yMul: 0, z: 0, scale: 1 },
] as const;

/** Per-column rotateY flip — starts once the screen is mostly in view. */
const GRID_FLIP_Y = [50, -50, 50] as const;
const GRID_FLIP_PERSPECTIVE = 1200;
const GRID_FLIP_START = 'top 88%';
const GRID_FLIP_END = 'top 62%';

function readCaseCol(el: HTMLElement): number {
  const raw =
    el.dataset.caseCol ??
    el.closest<HTMLElement>('[data-case-col]')?.dataset.caseCol ??
    '0';
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
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

function readSliceDeckRotateY(motion: HTMLElement): number {
  if (motion.classList.contains('case-scroll-motion--lag-odd-desktop')) return -8;
  if (motion.classList.contains('case-scroll-motion--lag-odd-mobile')) return -6;
  if (motion.classList.contains('case-scroll-motion--lag-even-desktop')) return 8;
  if (motion.classList.contains('case-scroll-motion--lag-even-mobile')) return 6;
  return 0;
}

function buildSliceTimeline(motion: HTMLElement, lagPx: number): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });
  const deckRotateY = readSliceDeckRotateY(motion);
  const from = SLICE_STOPS[0]!;
  gsap.set(motion, {
    opacity: from.opacity,
    rotateX: from.rotateX,
    rotateY: deckRotateY,
    z: from.z,
    y: from.yMul * lagPx,
    scale: from.scale,
    transformOrigin: 'center bottom',
    force3D: true,
  });

  for (let i = 1; i < SLICE_STOPS.length; i += 1) {
    const prev = SLICE_STOPS[i - 1]!;
    const stop = SLICE_STOPS[i]!;
    const duration = stop.t - prev.t;
    const rotateY = stop.t >= 0.62 ? 0 : deckRotateY * (1 - stop.t / 0.62);
    tl.to(
      motion,
      {
        opacity: stop.opacity,
        rotateX: stop.rotateX,
        rotateY,
        z: stop.z,
        y: stop.yMul * lagPx,
        scale: stop.scale,
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
  const motionGate = useCaseMotionGate();

  let triggers: ScrollTrigger[] = [];
  let loadHandlers: Array<{ img: HTMLImageElement; fn: () => void }> = [];
  let registered = false;
  let mq: MediaQueryList | null = null;
  let stopPose: (() => void) | null = null;

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
    const preset = presetRef.value;

    bindImageLoads(scope);
    const pairs = collectPairs(scope, triggerSelector, motionSelector);

    for (const { trigger, motion } of pairs) {
      if (preset === 'screensGrid') {
        const col = readCaseCol(motion);
        const fromY = GRID_FLIP_Y[col] ?? GRID_FLIP_Y[1]!;
        gsap.set(motion, {
          opacity: 0,
          rotateX: 0,
          rotateY: fromY,
          z: 0,
          y: 0,
          transformOrigin: 'center center',
          transformPerspective: GRID_FLIP_PERSPECTIVE,
          force3D: true,
        });
        const tween = gsap.to(motion, {
          opacity: 1,
          rotateY: 0,
          ease: 'power2.out',
          scrollTrigger: {
            trigger,
            start: GRID_FLIP_START,
            end: GRID_FLIP_END,
            scrub: true,
          },
        });
        if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
        continue;
      }

      if (preset === 'fade') {
        gsap.set(motion, {
          opacity: 0,
          y: 18,
          rotateX: 0,
          rotateY: 0,
          z: 0,
          scale: 1,
        });
        const tween = gsap.to(motion, {
          opacity: 1,
          y: 0,
          duration: 0.65,
          ease: 'power2.out',
          scrollTrigger: {
            trigger,
            start: 'top 92%',
            toggleActions: 'play none none none',
          },
        });
        if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
        continue;
      }

      if (preset === 'lift') {
        gsap.set(motion, {
          opacity: 0,
          y: 36,
          scale: 0.96,
          rotateX: 14,
          rotateY: 0,
          z: -90,
          transformOrigin: 'center bottom',
          transformPerspective: 900,
          force3D: true,
        });
        const tween = gsap.to(motion, {
          opacity: 1,
          y: 0,
          scale: 1,
          rotateX: 0,
          z: 0,
          duration: 0.85,
          ease: 'power2.out',
          scrollTrigger: {
            trigger,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        });
        if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
        continue;
      }

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
          rotateX: 24,
          rotateY: 0,
          z: -140,
          y: 40,
          transformOrigin: 'center center',
          force3D: true,
        });
        const tween = gsap.to(motion, {
          opacity: 1,
          rotateX: 0,
          z: 0,
          y: 0,
          ease: 'power2.out',
          scrollTrigger: { trigger, start, end, scrub: true },
        });
        if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
        continue;
      }
    }
  }

  function tryInit() {
    if (isAwaitingPose() || !motionGate.value) {
      if (!motionGate.value) kill();
      return;
    }
    init();
  }

  function onMqChange() {
    nextTick(() => tryInit());
  }

  onMounted(() => {
    if (import.meta.client) {
      mq = window.matchMedia('(min-width: 1024px)');
      mq.addEventListener('change', onMqChange);
      stopPose = subscribeAwaitingPose((awaiting) => {
        if (!awaiting) nextTick(() => tryInit());
      });
    }
    nextTick(() => tryInit());
  });

  onBeforeUnmount(() => {
    mq?.removeEventListener('change', onMqChange);
    stopPose?.();
    stopPose = null;
    kill();
  });

  watch([root, presetRef, motionGate], () => {
    nextTick(() => tryInit());
  });

  return { refresh: init, kill };
}
