import gsap from 'gsap';
import type { MaybeRefOrGetter } from 'vue';
import { prefersReducedMotion } from '~/lib/a11y/reducedMotion';
import { useCaseMotionGate } from '~/composables/caseMotionGate';

export type CaseInteractiveMode = 'landing' | 'device' | 'slice';

export type CaseInteractiveOptions = {
  root: Ref<HTMLElement | null>;
  mode: MaybeRefOrGetter<CaseInteractiveMode>;
  enabled?: MaybeRefOrGetter<boolean>;
  revision?: MaybeRefOrGetter<string | number>;
};

const TILT_MAX_X = 4;
const TILT_MAX_Y = 5;
const DEVICE_TILT_MAX = 8;

/** Taller frames need less pitch/yaw or the far edge swings too far. */
function aspectTiltScale(el: HTMLElement): { x: number; y: number } {
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  if (w <= 0 || h <= 0) return { x: 1, y: 1 };
  const aspect = h / w;
  return {
    x: Math.min(1, Math.max(0.28, 1.05 / aspect)),
    y: Math.min(1, Math.max(0.38, 1.35 / aspect)),
  };
}

function canUseFinePointer(): boolean {
  if (!import.meta.client) return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function normPointer(el: HTMLElement, clientX: number, clientY: number) {
  const rect = el.getBoundingClientRect();
  const x = rect.width > 0 ? (clientX - rect.left) / rect.width : 0.5;
  const y = rect.height > 0 ? (clientY - rect.top) / rect.height : 0.5;
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  };
}

function visibleInnerStage(scope: HTMLElement): HTMLElement {
  const desktop = scope.querySelector<HTMLElement>(
    '.case-inner-pages__stage--desktop',
  );
  const mobile = scope.querySelector<HTMLElement>(
    '.case-inner-pages__stage--mobile',
  );
  if (desktop && mobile) {
    return window.matchMedia('(min-width: 1024px)').matches ? desktop : mobile;
  }
  return scope;
}

function cueLabel(mode: CaseInteractiveMode): string {
  if (mode === 'landing') return 'INSPECT';
  if (mode === 'device') return 'TILT';
  return 'ZOOM';
}

export function useCaseInteractive(options: CaseInteractiveOptions) {
  const motionGate = useCaseMotionGate();
  const lightbox = useCaseLightbox();
  const modeRef = computed(() => toValue(options.mode));
  const revisionRef = computed(() => toValue(options.revision) ?? '');
  const enabledRef = computed(
    () =>
      toValue(options.enabled) !== false &&
      motionGate.value &&
      !lightbox.state.open,
  );

  let io: IntersectionObserver | null = null;
  let mqWide: MediaQueryList | null = null;
  let inView = false;
  let tiltTarget: HTMLElement | null = null;
  let stageEl: HTMLElement | null = null;
  let focusedCard: HTMLElement | null = null;
  let cueEl: HTMLElement | null = null;
  let gyroHandler: ((event: DeviceOrientationEvent) => void) | null = null;
  let quickTiltX: gsap.QuickToFunc | null = null;
  let quickTiltY: gsap.QuickToFunc | null = null;
  let quickGlareX: gsap.QuickToFunc | null = null;
  let quickGlareY: gsap.QuickToFunc | null = null;
  let quickGlareOpacity: gsap.QuickToFunc | null = null;

  function isActive(): boolean {
    return (
      import.meta.client &&
      enabledRef.value &&
      inView &&
      !prefersReducedMotion() &&
      Boolean(options.root.value)
    );
  }

  function ensureCue(scope: HTMLElement) {
    cueEl = scope.querySelector<HTMLElement>('.case-interactive__cue');
    if (cueEl) return;
    cueEl = document.createElement('span');
    cueEl.className = 'case-interactive__cue';
    cueEl.setAttribute('aria-hidden', 'true');
    scope.appendChild(cueEl);
  }

  function setCue(scope: HTMLElement, clientX: number, clientY: number) {
    if (!cueEl || !canUseFinePointer()) return;
    const rect = scope.getBoundingClientRect();
    scope.style.setProperty('--cue-x', (clientX - rect.left).toFixed(1));
    scope.style.setProperty('--cue-y', (clientY - rect.top).toFixed(1));
    cueEl.textContent = cueLabel(modeRef.value);
  }

  function bindQuickTo(target: HTMLElement) {
    quickTiltX = gsap.quickTo(target, '--tilt-x', {
      duration: 0.45,
      ease: 'power2.out',
    });
    quickTiltY = gsap.quickTo(target, '--tilt-y', {
      duration: 0.45,
      ease: 'power2.out',
    });
    quickGlareX = gsap.quickTo(target, '--glare-x', {
      duration: 0.5,
      ease: 'power2.out',
    });
    quickGlareY = gsap.quickTo(target, '--glare-y', {
      duration: 0.5,
      ease: 'power2.out',
    });
    quickGlareOpacity = gsap.quickTo(target, '--glare-opacity', {
      duration: 0.35,
      ease: 'power2.out',
    });
  }

  function applyTilt(x: number, y: number, maxX: number, maxY: number) {
    if (!tiltTarget || !quickTiltX || !quickTiltY) return;
    const scale = aspectTiltScale(tiltTarget);
    quickTiltX((0.5 - y) * maxX * 2 * scale.x);
    quickTiltY((x - 0.5) * maxY * 2 * scale.y);
    quickGlareX?.(x * 100);
    quickGlareY?.(y * 100);
    quickGlareOpacity?.(pointerInside ? 1 : 0);
  }

  let pointerInside = false;

  function setCardFocus(card: HTMLElement | null) {
    if (focusedCard === card) return;
    focusedCard?.classList.remove('is-interactive-focus');
    focusedCard = card;
    focusedCard?.classList.add('is-interactive-focus');
    stageEl?.classList.toggle('has-interactive-focus', Boolean(focusedCard));
  }

  function resetTilt() {
    if (!tiltTarget) return;
    quickTiltX?.(0);
    quickTiltY?.(0);
    quickGlareOpacity?.(0);
    quickGlareX?.(50);
    quickGlareY?.(50);
  }

  function onPointerMove(event: PointerEvent) {
    if (!isActive() || !canUseFinePointer()) return;
    const scope = options.root.value;
    if (!scope) return;

    pointerInside = true;
    scope.classList.add('is-interactive-active');
    setCue(scope, event.clientX, event.clientY);

    const mode = modeRef.value;
    if (mode === 'landing' && tiltTarget) {
      const { x, y } = normPointer(tiltTarget, event.clientX, event.clientY);
      applyTilt(x, y, TILT_MAX_X, TILT_MAX_Y);
      return;
    }

    if (mode === 'device' && tiltTarget) {
      const { x, y } = normPointer(tiltTarget, event.clientX, event.clientY);
      applyTilt(x, y, DEVICE_TILT_MAX, DEVICE_TILT_MAX);
    }
  }

  function onPointerLeave() {
    const scope = options.root.value;
    if (!scope) return;
    pointerInside = false;
    scope.classList.remove('is-interactive-active');
    setCardFocus(null);
    resetTilt();
  }

  function onPointerOver(event: PointerEvent) {
    if (!isActive() || !canUseFinePointer()) return;
    if (modeRef.value !== 'slice') return;
    const target = event.target as HTMLElement | null;
    setCardFocus(
      target?.closest<HTMLElement>('.case-interactive__slice') ?? null,
    );
  }

  function bindGyro() {
    if (!import.meta.client || prefersReducedMotion()) return;
    if (canUseFinePointer()) return;
    if (modeRef.value !== 'device') return;

    gyroHandler = (event: DeviceOrientationEvent) => {
      if (!isActive() || !tiltTarget) return;
      const beta = event.beta ?? 0;
      const gamma = event.gamma ?? 0;
      const tiltX = Math.max(
        -DEVICE_TILT_MAX,
        Math.min(DEVICE_TILT_MAX, (beta - 45) * 0.12),
      );
      const tiltY = Math.max(
        -DEVICE_TILT_MAX,
        Math.min(DEVICE_TILT_MAX, gamma * 0.15),
      );
      tiltTarget.style.setProperty('--tilt-x', tiltX.toFixed(2));
      tiltTarget.style.setProperty('--tilt-y', tiltY.toFixed(2));
      tiltTarget.style.setProperty(
        '--glare-x',
        (50 + (tiltY / DEVICE_TILT_MAX) * 28).toFixed(1),
      );
      tiltTarget.style.setProperty(
        '--glare-y',
        (50 + (tiltX / DEVICE_TILT_MAX) * 28).toFixed(1),
      );
      tiltTarget.style.setProperty('--glare-opacity', '0.55');
    };

    window.addEventListener('deviceorientation', gyroHandler, { passive: true });
  }

  function unbindGyro() {
    if (!gyroHandler) return;
    window.removeEventListener('deviceorientation', gyroHandler);
    gyroHandler = null;
  }

  function resolveTargets(scope: HTMLElement) {
    const mode = modeRef.value;
    const stage = visibleInnerStage(scope);

    if (mode === 'landing') {
      tiltTarget =
        stage.querySelector<HTMLElement>('.case-interactive__tilt') ?? null;
      if (tiltTarget) bindQuickTo(tiltTarget);
      return;
    }

    if (mode === 'device') {
      tiltTarget =
        scope.querySelector<HTMLElement>('.case-interactive__tilt') ?? null;
      if (tiltTarget) bindQuickTo(tiltTarget);
      return;
    }

    stageEl = scope;
  }

  function bindPointer() {
    const scope = options.root.value;
    if (!scope || !import.meta.client) return;

    resolveTargets(scope);
    ensureCue(scope);
    scope.addEventListener('pointermove', onPointerMove);
    scope.addEventListener('pointerleave', onPointerLeave);
    if (modeRef.value === 'slice') {
      scope.addEventListener('pointerover', onPointerOver);
    }
    bindGyro();
  }

  function unbindPointer() {
    const scope = options.root.value;
    if (scope) {
      scope.removeEventListener('pointermove', onPointerMove);
      scope.removeEventListener('pointerleave', onPointerLeave);
      scope.removeEventListener('pointerover', onPointerOver);
      scope.classList.remove('is-interactive-active');
      scope.style.removeProperty('--cue-x');
      scope.style.removeProperty('--cue-y');
    }
    setCardFocus(null);
    resetTilt();
    unbindGyro();
    quickTiltX = null;
    quickTiltY = null;
    quickGlareX = null;
    quickGlareY = null;
    quickGlareOpacity = null;
    tiltTarget = null;
    stageEl = null;
    cueEl = null;
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
    bindPointer();
    observe();
  }

  function onMqChange() {
    nextTick(() => setup());
  }

  watch(enabledRef, (enabled) => {
    if (!enabled) {
      onPointerLeave();
      unbindPointer();
      io?.disconnect();
      io = null;
      return;
    }
    nextTick(() => setup());
  });

  watch([() => options.root.value, modeRef, revisionRef], () => {
    nextTick(() => setup());
  });

  onMounted(() => {
    if (import.meta.client) {
      mqWide = window.matchMedia('(min-width: 1024px)');
      mqWide.addEventListener('change', onMqChange);
    }
    nextTick(() => setup());
  });

  onBeforeUnmount(() => {
    mqWide?.removeEventListener('change', onMqChange);
    mqWide = null;
    io?.disconnect();
    io = null;
    unbindPointer();
  });

  return { setup, teardown: unbindPointer };
}
