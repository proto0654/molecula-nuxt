import { prefersReducedMotion } from '~/lib/a11y/reducedMotion';

/**
 * Page-space dust shed from the listing hairlines as they draw.
 *
 * The listing conductor calls `queueHairlineDust` on the frame a reveal class
 * lands. Styling and timing stay in CSS: the line pseudo's computed
 * `animation-delay` / `animation-duration` / `animation-timing-function` are the
 * only clock. Particles are absolutely positioned inside the page body, so they
 * scroll with the document and need no scroll listener or render loop.
 *
 * Deliberately ignores the short `.archive-row__line` tick
 * (`wl-enter-line-scale`) and prose heading rules — only structural full-width
 * lines shed dust. See docs/MOTION.md.
 */

const LINE_ANIMATION = 'wl-enter-line';
const DUST_LAYER_SELECTOR = '.hairline-dust';
const BODY_SELECTOR = '.archive-page__body, .case-page__body';

const MAX_ACTIVE_PARTICLES = 72;
const MIN_PARTICLES = 3;
const MAX_PARTICLES = 10;
const PARTICLE_SPACING_PX = 160;
/** Share of the line draw that emits; the last grains still have time to fall. */
const EMIT_WINDOW_RATIO = 0.78;
/** >1 packs more emissions into the first part of the draw, near the line start. */
const EMIT_PROGRESS_BIAS = 1.6;
/** Keep the grain behind the wipe tip instead of ahead of it. */
const TIP_LAG = 0.012;
/** Keep flight inside the page body instead of clipping at the right screen edge. */
const EDGE_GUTTER_PX = 10;
const ACCENT_CHANCE = 0.24;

const PARTICLE_SIZE_MIN = 2;
const PARTICLE_SIZE_MAX = 5;
const PARTICLE_LIFE_MIN = 720;
const PARTICLE_LIFE_SPAN = 380;
const PARTICLE_TRAVEL_MIN = 50;
const PARTICLE_TRAVEL_SPAN = 110;
const PARTICLE_FALL_MIN = 36;
const PARTICLE_FALL_SPAN = 110;
const PARTICLE_DRIFT_SPAN = 36;
const PARTICLE_OPACITY_MIN = 0.7;
const PARTICLE_OPACITY_SPAN = 0.2;
/** Only a minority gets the fast horizontal kick, so the field stays uneven. */
const FAST_PARTICLE_CHANCE = 0.28;
const FAST_LIFE_MIN = 600;
const FAST_LIFE_SPAN = 260;
const FAST_TRAVEL_MIN = 150;
const FAST_TRAVEL_SPAN = 120;

type Pseudo = '::before' | '::after';
type LineEdge = 'top' | 'bottom';

type LineDraw = {
  owner: HTMLElement;
  pseudo: Pseudo;
  edge: LineEdge;
  delay: number;
  duration: number;
  easing: (progress: number) => number;
};

type LayerState = {
  timers: Set<number>;
  particles: Set<HTMLElement>;
};

type PendingReveal = {
  el: HTMLElement;
  at: number;
};

const pending: PendingReveal[] = [];
const layerStates = new WeakMap<HTMLElement, LayerState>();
const liveParticles = new Set<HTMLElement>();
let flushFrame = 0;

/**
 * Called by `useListingReveal` after `is-revealed` lands. Never measures layout
 * here — the whole batch is read in one rAF to avoid thrashing a chain.
 */
export function queueHairlineDust(el: HTMLElement): void {
  if (!import.meta.client || prefersReducedMotion()) return;
  pending.push({ el, at: performance.now() });
  if (flushFrame !== 0) return;
  flushFrame = requestAnimationFrame(flushPending);
}

/** Drops pending timers and particles when the page body unmounts. */
export function disposeHairlineDust(layer: HTMLElement): void {
  const state = layerStates.get(layer);
  if (!state) return;

  for (const timer of state.timers) window.clearTimeout(timer);
  state.timers.clear();

  for (const particle of [...state.particles]) {
    particle.remove();
    liveParticles.delete(particle);
  }
  state.particles.clear();
  layerStates.delete(layer);
}

function flushPending(): void {
  flushFrame = 0;
  if (!pending.length || prefersReducedMotion()) return;

  const batch = pending.splice(0);
  for (const { el, at } of batch) {
    if (!el.isConnected) continue;
    const layer = findLayer(el);
    if (!layer) continue;
    const line = resolveLine(el);
    if (!line) continue;
    scheduleLine(layer, line, at);
  }
}

function findLayer(el: HTMLElement): HTMLElement | null {
  const body = el.closest<HTMLElement>(BODY_SELECTOR);
  return body?.querySelector<HTMLElement>(DUST_LAYER_SELECTOR) ?? null;
}

/**
 * Only structural rules shed dust:
 * - archive listing / detail rows — top `::before`;
 * - case section marker rail — `::after`;
 * - post navigation — separator above Previous.
 */
function resolveLine(el: HTMLElement): LineDraw | null {
  if (el.classList.contains('case-nav')) {
    const prev = el.querySelector<HTMLElement>('.case-nav__prev');
    if (prev) {
      const line = readLineDraw(prev, '::after');
      if (line) return line;
    }
    const marker = el.querySelector<HTMLElement>(
      '.case-marker--editorial, .case-marker--visual',
    );
    return marker ? readLineDraw(marker, '::after') : null;
  }

  if (el.classList.contains('case-section')) {
    const marker = el.querySelector<HTMLElement>(
      '.case-marker--editorial, .case-marker--visual',
    );
    return marker ? readLineDraw(marker, '::after') : null;
  }

  if (el.classList.contains('archive-row')) {
    return readLineDraw(el, '::before') ?? readLineDraw(el, '::after');
  }

  return null;
}

function readLineDraw(owner: HTMLElement, pseudo: Pseudo): LineDraw | null {
  const style = getComputedStyle(owner, pseudo);
  const names = splitTopLevel(style.animationName);
  const index = names.indexOf(LINE_ANIMATION);
  if (index < 0) return null;

  const durations = splitTopLevel(style.animationDuration);
  const duration = parseTime(durations[index] ?? '0s');
  if (duration <= 0) return null;

  const delays = splitTopLevel(style.animationDelay);
  const easings = splitTopLevel(style.animationTimingFunction);

  return {
    owner,
    pseudo,
    edge: style.top !== 'auto' ? 'top' : 'bottom',
    delay: Math.max(0, parseTime(delays[index] ?? '0s')),
    duration,
    easing: parseEasing(easings[index] ?? 'linear'),
  };
}

function scheduleLine(
  layer: HTMLElement,
  line: LineDraw,
  revealedAt: number,
): void {
  const lineStart = revealedAt + line.delay;
  if (performance.now() - lineStart > line.duration * 1.15) return;

  const width = line.owner.clientWidth;
  if (width < 1) return;

  const count = Math.max(
    MIN_PARTICLES,
    Math.min(MAX_PARTICLES, Math.round(width / PARTICLE_SPACING_PX)),
  );
  const state = getLayerState(layer);
  const emitWindow = line.duration * EMIT_WINDOW_RATIO;
  const slot = emitWindow / count;

  for (let i = 0; i < count; i += 1) {
    const biased = Math.pow((i + 0.5) / count, EMIT_PROGRESS_BIAS);
    const due = lineStart + emitWindow * biased + (Math.random() - 0.5) * slot * 0.5;
    const wait = Math.max(0, due - performance.now());
    const timer = window.setTimeout(() => {
      state.timers.delete(timer);
      spawnParticle(layer, line, lineStart);
    }, wait);
    state.timers.add(timer);
  }
}

function spawnParticle(
  layer: HTMLElement,
  line: LineDraw,
  lineStart: number,
): void {
  if (!layer.isConnected || !line.owner.isConnected) return;
  if (prefersReducedMotion()) return;
  if (liveParticles.size >= MAX_ACTIVE_PARTICLES) return;

  const rawProgress = (performance.now() - lineStart) / line.duration;
  if (rawProgress > 1) return;

  const ownerRect = line.owner.getBoundingClientRect();
  if (ownerRect.width < 1 || ownerRect.height < 1) return;

  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  if (ownerRect.right < 0 || ownerRect.left > viewportWidth) return;

  const layerRect = layer.getBoundingClientRect();
  const lineLeft = ownerRect.left + line.owner.clientLeft;
  const lineWidth = line.owner.clientWidth;
  const lineTop = ownerRect.top + line.owner.clientTop;
  const lineY =
    line.edge === 'top' ? lineTop : lineTop + line.owner.clientHeight;
  if (lineY < -12 || lineY > viewportHeight + 12) return;

  const progress = Math.max(
    0,
    line.easing(Math.min(1, Math.max(0, rawProgress))) - TIP_LAG,
  );
  const rightLimit = layerRect.right - EDGE_GUTTER_PX;
  if (rightLimit <= layerRect.left) return;

  const startX = Math.max(
    layerRect.left + 1,
    Math.min(
      lineLeft + lineWidth * progress + (Math.random() - 0.5) * 16,
      rightLimit,
    ),
  );
  const y = lineY - layerRect.top + (Math.random() - 0.5) * 4;

  const fast = Math.random() < FAST_PARTICLE_CHANCE;
  const rawTravel = fast
    ? FAST_TRAVEL_MIN + Math.random() * FAST_TRAVEL_SPAN
    : PARTICLE_TRAVEL_MIN + Math.random() * PARTICLE_TRAVEL_SPAN;
  const drift = (Math.random() - 0.5) * PARTICLE_DRIFT_SPAN;
  const travel = Math.min(
    rawTravel,
    Math.max(0, rightLimit - startX - Math.max(0, drift)),
  );
  const x = startX - layerRect.left;

  const life = fast
    ? FAST_LIFE_MIN + Math.random() * FAST_LIFE_SPAN
    : PARTICLE_LIFE_MIN + Math.random() * PARTICLE_LIFE_SPAN;
  const fall = PARTICLE_FALL_MIN + Math.random() * PARTICLE_FALL_SPAN;
  const peakOpacity = PARTICLE_OPACITY_MIN + Math.random() * PARTICLE_OPACITY_SPAN;
  const size =
    PARTICLE_SIZE_MIN +
    Math.floor(Math.random() * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN + 1));
  const duration = Math.round(life);

  const state = getLayerState(layer);
  const particle = document.createElement('span');
  particle.className = 'hairline-dust__particle';
  if (Math.random() < ACCENT_CHANCE) particle.classList.add('is-accent');
  particle.style.left = `${Math.round(x)}px`;
  particle.style.top = `${Math.round(y)}px`;
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
  particle.style.setProperty('--dust-travel', `${Math.round(travel)}px`);
  particle.style.setProperty('--dust-fall', `${Math.round(fall)}px`);
  particle.style.setProperty('--dust-drift', `${Math.round(drift)}px`);
  particle.style.setProperty('--dust-peak', peakOpacity.toFixed(2));
  particle.style.animationDuration = `${duration}ms`;

  layer.append(particle);
  liveParticles.add(particle);
  state.particles.add(particle);

  let cleanupTimer = 0;
  cleanupTimer = window.setTimeout(() => {
    state.timers.delete(cleanupTimer);
    state.particles.delete(particle);
    liveParticles.delete(particle);
    particle.remove();
  }, duration + 60);
  state.timers.add(cleanupTimer);
}

function getLayerState(layer: HTMLElement): LayerState {
  let state = layerStates.get(layer);
  if (!state) {
    state = { timers: new Set(), particles: new Set() };
    layerStates.set(layer, state);
  }
  return state;
}

/** Top-level comma split — keeps `cubic-bezier(a, b, c, d)` intact. */
function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char === '(') depth += 1;
    else if (char === ')') depth = Math.max(0, depth - 1);
    else if (char === ',' && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }

  parts.push(value.slice(start).trim());
  return parts;
}

function parseTime(value: string): number {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return value.trim().endsWith('ms') ? n : n * 1000;
}

function parseEasing(value: string): (progress: number) => number {
  const match = /^cubic-bezier\(([^)]+)\)$/.exec(value.trim());
  if (match) {
    const points = match[1].split(',').map((part) => Number.parseFloat(part));
    if (points.length === 4 && points.every(Number.isFinite)) {
      return cubicBezier(points[0]!, points[1]!, points[2]!, points[3]!);
    }
  }

  switch (value.trim()) {
    case 'ease':
      return cubicBezier(0.25, 0.1, 0.25, 1);
    case 'ease-in':
      return cubicBezier(0.42, 0, 1, 1);
    case 'ease-out':
      return cubicBezier(0, 0, 0.58, 1);
    case 'ease-in-out':
      return cubicBezier(0.42, 0, 0.58, 1);
    default:
      return (progress) => progress;
  }
}

function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): (x: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    let low = 0;
    let high = 1;
    for (let i = 0; i < 20; i += 1) {
      const mid = (low + high) * 0.5;
      if (sampleX(mid) < x) low = mid;
      else high = mid;
    }
    return sampleY((low + high) * 0.5);
  };
}
