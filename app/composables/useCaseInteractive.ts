import gsap from 'gsap';
import type { MaybeRefOrGetter } from 'vue';
import { prefersReducedMotion } from '~/lib/a11y/reducedMotion';
import { useCaseMotionGate } from '~/composables/caseMotionGate';

export type CaseInteractiveMode = 'landing' | 'grid' | 'device' | 'slice';

export type CaseInteractiveOptions = {
  root: Ref<HTMLElement | null>;
  mode: MaybeRefOrGetter<CaseInteractiveMode>;
  enabled?: MaybeRefOrGetter<boolean>;
};

type PointerState = {
  x: number;
  y: number;
  inside: boolean;
};

const TILT_MAX_X = 4;
const TILT_MAX_Y = 5;
const DEVICE_TILT_MAX = 8;

function canUseFinePointer(): boolean {
  if (!import.meta.client) return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normPointer(el: HTMLElement, clientX: number, clientY: number) {
  const rect = el.getBoundingClientRect();
  const x = rect.width > 0 ? (clientX - rect.left) / rect.width : 0.5;
  const y = rect.height > 0 ? (clientY - rect.top) / rect.height : 0.5;
  return { x: clamp01(x), y: clamp01(y), rect };
}

function setGlareVars(el: HTMLElement, x: number, y: number, opacity: number) {
  el.style.setProperty('--glare-x', `${(x * 100).toFixed(2)}%`);
  el.style.setProperty('--glare-y', `${(y * 100).toFixed(2)}%`);
  el.style.setProperty('--glare-opacity', String(opacity));
}

function resetInteractiveVars(el: HTMLElement) {
  el.style.removeProperty('--tilt-x');
  el.style.removeProperty('--tilt-y');
  el.style.removeProperty('--glare-x');
  el.style.removeProperty('--glare-y');
  el.style.removeProperty('--glare-opacity');
  el.style.removeProperty('--scan-progress');
  el.style.removeProperty('--scan-y');
  el.classList.remove('is-interactive-active', 'is-interactive-focus');
}

export function useCaseInteractive(options: CaseInteractiveOptions) {
  const motionGate = useCaseMotionGate();
  const modeRef = computed(() => toValue(options.mode));
  const enabledRef = computed(
    () => toValue(options.enabled) !== false && motionGate.value,
  );

  let io: IntersectionObserver | null = null;
  let inView = false;
  let pointer: PointerState = { x: 0.5, y: 0.5, inside: false };
  let quickTiltX: gsap.QuickToFunc | null = null;
  let quickTiltY: gsap.QuickToFunc | null = null;
  let quickGlareX: gsap.QuickToFunc | null = null;
  let quickGlareY: gsap.QuickToFunc | null = null;
  let quickGlareOpacity: gsap.QuickToFunc | null = null;
  let quickScanY: gsap.QuickToFunc | null = null;
  let quickScanProgress: gsap.QuickToFunc | null = null;
  let gyroHandler: ((event: DeviceOrientationEvent) => void) | null = null;
  let focusedCard: HTMLElement | null = null;
  let stageEl: HTMLElement | null = null;
  let tiltTarget: HTMLElement | null = null;
  let scannerImg: HTMLImageElement | null = null;
  let scannerViewport: HTMLElement | null = null;

  function isActive(): boolean {
    return (
      import.meta.client &&
      enabledRef.value &&
      inView &&
      !prefersReducedMotion() &&
      Boolean(options.root.value)
    );
  }

  function resolveLandingTargets(scope: HTMLElement) {
    tiltTarget =
      scope.querySelector<HTMLElement>('.case-interactive__tilt') ?? scope;
    scannerViewport = scope.querySelector<HTMLElement>(
      '.case-interactive__scanner',
    );
    scannerImg = scope.querySelector<HTMLImageElement>(
      '.case-interactive__scanner img',
    );
  }

  function resolveGridStage(scope: HTMLElement) {
    stageEl =
      scope.querySelector<HTMLElement>('.case-inner-pages__stage--desktop') ??
      scope.querySelector<HTMLElement>('.case-inner-pages__stage--mobile') ??
      scope;
  }

  function resolveDeviceTarget(scope: HTMLElement) {
    tiltTarget =
      scope.querySelector<HTMLElement>('.case-interactive__tilt') ?? scope;
  }

  function bindQuickTo() {
    if (!tiltTarget) return;
    quickTiltX = gsap.quickTo(tiltTarget, '--tilt-x', {
      duration: 0.45,
      ease: 'power2.out',
    });
    quickTiltY = gsap.quickTo(tiltTarget, '--tilt-y', {
      duration: 0.45,
      ease: 'power2.out',
    });
    quickGlareX = gsap.quickTo(tiltTarget, '--glare-x', {
      duration: 0.5,
      ease: 'power2.out',
    });
    quickGlareY = gsap.quickTo(tiltTarget, '--glare-y', {
      duration: 0.5,
      ease: 'power2.out',
    });
    quickGlareOpacity = gsap.quickTo(tiltTarget, '--glare-opacity', {
      duration: 0.35,
      ease: 'power2.out',
    });
    if (scannerViewport) {
      const scanHost =
        scannerViewport.closest<HTMLElement>('.case-interactive__viewport') ??
        scannerViewport;
      quickScanY = gsap.quickTo(scannerViewport, '--scan-y', {
        duration: 0.55,
        ease: 'power2.out',
      });
      quickScanProgress = gsap.quickTo(scanHost, '--scan-progress', {
        duration: 0.55,
        ease: 'power2.out',
      });
    }
  }

  function applyTilt(x: number, y: number, maxX: number, maxY: number) {
    if (!tiltTarget || !quickTiltX || !quickTiltY) return;
    const tiltX = (0.5 - y) * maxX * 2;
    const tiltY = (x - 0.5) * maxY * 2;
    quickTiltX(`${tiltX.toFixed(3)}deg`);
    quickTiltY(`${tiltY.toFixed(3)}deg`);
    quickGlareX?.(`${(x * 100).toFixed(2)}%`);
    quickGlareY?.(`${(y * 100).toFixed(2)}%`);
    quickGlareOpacity?.(pointer.inside ? '1' : '0');
  }

  function applyScanner(y: number) {
    if (!scannerImg || !scannerViewport || !quickScanY || !quickScanProgress) {
      return;
    }
    const viewportH = scannerViewport.clientHeight;
    const imgH = scannerImg.naturalHeight
      ? (scannerImg.naturalWidth > 0
          ? (scannerImg.naturalHeight / scannerImg.naturalWidth) *
            scannerViewport.clientWidth
          : scannerImg.offsetHeight)
      : scannerImg.offsetHeight;
    const overflow = Math.max(0, imgH - viewportH);
    if (overflow <= 0) {
      quickScanY('0px');
      quickScanProgress('0');
      return;
    }
    const offset = -overflow * y;
    quickScanY(`${offset.toFixed(2)}px`);
    quickScanProgress(String(y));
    scannerViewport.dataset.scanPercent = `${Math.round(y * 100)
      .toString()
      .padStart(2, '0')}`;
  }

  function applyGridParallax(x: number, y: number) {
    if (!stageEl) return;
    const cols = stageEl.querySelectorAll<HTMLElement>('.case-inner-pages__column');
    if (cols.length) {
      for (const col of cols) {
        const colIndex = Number(col.dataset.caseCol ?? '0');
        const mul =
          colIndex === 0 ? 0.02 : colIndex === 1 ? 0.04 : colIndex === 2 ? 0.025 : 0.03;
        const tx = (x - 0.5) * mul * 100;
        const ty = (y - 0.5) * mul * 80;
        col.style.setProperty('--parallax-x', `${tx.toFixed(2)}px`);
        col.style.setProperty('--parallax-y', `${ty.toFixed(2)}px`);
      }
      return;
    }
    const cards = stageEl.querySelectorAll<HTMLElement>(
      '.case-inner-pages__card-wrapper',
    );
    for (const card of cards) {
      const colIndex = Number(card.dataset.caseCol ?? '0');
      const mul = colIndex % 2 === 0 ? 0.02 : 0.035;
      const tx = (x - 0.5) * mul * 100;
      const ty = (y - 0.5) * mul * 80;
      card.style.setProperty('--parallax-x', `${tx.toFixed(2)}px`);
      card.style.setProperty('--parallax-y', `${ty.toFixed(2)}px`);
    }
  }

  function clearGridParallax() {
    if (!stageEl) return;
    const nodes = stageEl.querySelectorAll<HTMLElement>(
      '.case-inner-pages__column, .case-inner-pages__card-wrapper',
    );
    for (const node of nodes) {
      node.style.removeProperty('--parallax-x');
      node.style.removeProperty('--parallax-y');
    }
  }

  function setCardFocus(card: HTMLElement | null) {
    if (focusedCard === card) return;
    if (focusedCard) {
      focusedCard.classList.remove('is-interactive-focus');
    }
    focusedCard = card;
    if (focusedCard) {
      focusedCard.classList.add('is-interactive-focus');
    }
    stageEl?.classList.toggle('has-interactive-focus', Boolean(focusedCard));
  }

  function onPointerMove(event: PointerEvent) {
    if (!isActive() || !canUseFinePointer()) return;
    const scope = options.root.value;
    if (!scope) return;

    const mode = modeRef.value;
    const { x, y } = normPointer(scope, event.clientX, event.clientY);
    pointer = { x, y, inside: true };
    scope.classList.add('is-interactive-active');

    if (mode === 'landing') {
      applyTilt(x, y, TILT_MAX_X, TILT_MAX_Y);
      applyScanner(y);
      return;
    }

    if (mode === 'grid') {
      applyGridParallax(x, y);
      return;
    }

    if (mode === 'device') {
      applyTilt(x, y, DEVICE_TILT_MAX, DEVICE_TILT_MAX);
    }
  }

  function onPointerLeave() {
    const scope = options.root.value;
    if (!scope) return;
    pointer = { x: 0.5, y: 0.5, inside: false };
    scope.classList.remove('is-interactive-active');
    setCardFocus(null);

    if (tiltTarget && quickTiltX && quickTiltY) {
      quickTiltX('0deg');
      quickTiltY('0deg');
      quickGlareOpacity?.('0');
    }
    if (scannerViewport && quickScanY) {
      quickScanY('0px');
      quickScanProgress?.('0');
      delete scannerViewport.dataset.scanPercent;
    }
    clearGridParallax();
  }

  function onGridPointerOver(event: PointerEvent) {
    if (!isActive() || modeRef.value !== 'grid' || !canUseFinePointer()) return;
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      '.case-inner-pages__card-wrapper',
    );
    setCardFocus(target);
  }

  function bindGyro() {
    if (!import.meta.client || prefersReducedMotion()) return;
    if (canUseFinePointer()) return;
    if (modeRef.value !== 'device') return;

    gyroHandler = (event: DeviceOrientationEvent) => {
      if (!isActive() || !tiltTarget) return;
      const beta = event.beta ?? 0;
      const gamma = event.gamma ?? 0;
      const tiltX = Math.max(-DEVICE_TILT_MAX, Math.min(DEVICE_TILT_MAX, (beta - 45) * 0.12));
      const tiltY = Math.max(-DEVICE_TILT_MAX, Math.min(DEVICE_TILT_MAX, gamma * 0.15));
      tiltTarget.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
      tiltTarget.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
      setGlareVars(tiltTarget, 0.5 + tiltY / (DEVICE_TILT_MAX * 2), 0.5 + tiltX / (DEVICE_TILT_MAX * 2), 0.55);
    };

    window.addEventListener('deviceorientation', gyroHandler, { passive: true });
  }

  function unbindGyro() {
    if (gyroHandler) {
      window.removeEventListener('deviceorientation', gyroHandler);
      gyroHandler = null;
    }
  }

  function bindPointer() {
    const scope = options.root.value;
    if (!scope || !import.meta.client) return;

    const mode = modeRef.value;
    if (mode === 'landing') resolveLandingTargets(scope);
    if (mode === 'grid') resolveGridStage(scope);
    if (mode === 'device') resolveDeviceTarget(scope);
    if (mode === 'slice') tiltTarget = scope;

    bindQuickTo();
    scope.addEventListener('pointermove', onPointerMove);
    scope.addEventListener('pointerleave', onPointerLeave);
    if (mode === 'grid') {
      scope.addEventListener('pointerover', onGridPointerOver);
    }
    bindGyro();
  }

  function unbindPointer() {
    const scope = options.root.value;
    if (!scope) return;
    scope.removeEventListener('pointermove', onPointerMove);
    scope.removeEventListener('pointerleave', onPointerLeave);
    scope.removeEventListener('pointerover', onGridPointerOver);
    scope.classList.remove('is-interactive-active');
    resetInteractiveVars(scope);
    if (tiltTarget) resetInteractiveVars(tiltTarget);
    clearGridParallax();
    setCardFocus(null);
    unbindGyro();

    quickTiltX = null;
    quickTiltY = null;
    quickGlareX = null;
    quickGlareY = null;
    quickGlareOpacity = null;
    quickScanY = null;
    quickScanProgress = null;
    stageEl = null;
    tiltTarget = null;
    scannerImg = null;
    scannerViewport = null;
  }

  function observe() {
    io?.disconnect();
    const scope = options.root.value;
    if (!scope || !import.meta.client) return;

    io = new IntersectionObserver(
      (entries) => {
        inView = entries.some((entry) => entry.isIntersecting);
        if (!inView) onPointerLeave();
      },
      { root: null, rootMargin: '8% 0px', threshold: 0.05 },
    );
    io.observe(scope);
  }

  function setup() {
    unbindPointer();
    io?.disconnect();
    io = null;
    if (!enabledRef.value || prefersReducedMotion()) return;
    if (modeRef.value === 'slice') return;
    bindPointer();
    observe();
  }

  watch(enabledRef, (enabled) => {
    if (!enabled) {
      onPointerLeave();
      unbindPointer();
      return;
    }
    nextTick(() => setup());
  });

  watch([() => options.root.value, modeRef, enabledRef], () => {
    nextTick(() => setup());
  });

  onMounted(() => {
    nextTick(() => setup());
  });

  onBeforeUnmount(() => {
    io?.disconnect();
    io = null;
    unbindPointer();
  });

  return { setup, teardown: unbindPointer };
}
