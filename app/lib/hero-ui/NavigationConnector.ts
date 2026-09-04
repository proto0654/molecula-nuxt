import { getItemById } from '../navigation/navigationConfig';
import { NavigationState } from '../navigation/NavigationState';
import type { Navigation } from './Navigation';
import { prefersReducedMotion } from '../a11y/reducedMotion';

type AtomScreenPoint = {
  x: number;
  y: number;
  visible: boolean;
};

/** Opacity fade rate for idle / hover / active / zoom. */
const OPACITY_FOLLOW = 7;

/**
 * Soft fade when the horizontal span is extremely long (does not shorten the path).
 * Paths beyond this still draw to the atom; opacity eases down.
 */
const SOFT_FADE_SPAN_PX = 720;

/**
 * Keep the tip clear of the atom mesh + selection rings (screen px from center).
 */
const ENDPOINT_GAP = 36;

/** Minimum horizontal run before the elbow vertical. */
const MIN_ELBOW_RUN = 24;

const SVG_NS = 'http://www.w3.org/2000/svg';

function resolveConnectorItem(state: NavigationState): {
  itemId: string | null;
  showAsActive: boolean;
  showAsHover: boolean;
} {
  const committedId = state.committedItemId;
  const previewId = state.previewItemId;
  const hasDistinctPreview = Boolean(
    previewId && previewId !== committedId,
  );
  const itemId = hasDistinctPreview
    ? previewId
    : committedId ?? previewId;
  const showAsActive = Boolean(committedId && !hasDistinctPreview);
  const showAsHover = Boolean(
    hasDistinctPreview || (previewId !== null && !committedId),
  );
  return { itemId, showAsActive, showAsHover };
}

export type ProjectAtomFn = (atomId: string, out: AtomScreenPoint) => boolean;

/**
 * Screen-space SVG elbow from active sidebar item → projected atom.
 * Does not touch Three.js objects — only consumes projected pixels.
 * Endpoint tracks projection 1:1 (no lag). Tip + tiny marker stop short of the atom.
 */
export class NavigationConnector {
  readonly root: SVGSVGElement;
  private readonly line: SVGPolylineElement;
  private readonly endpoint: SVGCircleElement;
  private readonly projectAtom: ProjectAtomFn;
  private readonly navigation: Navigation;
  private readonly state: NavigationState;
  private readonly scratch: AtomScreenPoint = { x: 0, y: 0, visible: false };

  private enabled = false;
  private opacity = 0;
  private targetOpacity = 0;
  private pulse = 0;
  private lastItemId: string | null = null;
  private zoomFade = 0;
  private readonly unsubscribe: () => void;

  constructor(
    parent: HTMLElement,
    navigation: Navigation,
    state: NavigationState,
    projectAtom: ProjectAtomFn,
  ) {
    this.navigation = navigation;
    this.state = state;
    this.projectAtom = projectAtom;

    this.root = document.createElementNS(SVG_NS, 'svg');
    this.root.classList.add('nav-connector');
    this.root.setAttribute('aria-hidden', 'true');

    this.line = document.createElementNS(SVG_NS, 'polyline');
    this.line.classList.add('nav-connector__line');
    this.line.setAttribute('fill', 'none');
    this.line.setAttribute('stroke-linecap', 'square');
    this.line.setAttribute('stroke-linejoin', 'miter');

    this.endpoint = document.createElementNS(SVG_NS, 'circle');
    this.endpoint.classList.add('nav-connector__endpoint');
    this.endpoint.setAttribute('r', '2');

    this.root.append(this.line, this.endpoint);
    parent.append(this.root);

    this.unsubscribe = state.subscribe(() => {
      const { itemId } = resolveConnectorItem(state);
      if (itemId && itemId !== this.lastItemId) {
        this.pulse = prefersReducedMotion() ? 0 : 1;
        this.lastItemId = itemId;
      }
      if (!itemId) {
        this.lastItemId = null;
      }
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.targetOpacity = 0;
      this.opacity = 0;
      this.root.style.opacity = '0';
      this.root.classList.add('is-idle');
    }
  }

  setZoomFade(amount: number): void {
    this.zoomFade = Math.max(0, Math.min(1, amount));
  }

  /**
   * Call each frame after molecule matrices / projection are current.
   */
  update(delta: number): void {
    if (!this.enabled) {
      this.root.style.opacity = '0';
      return;
    }

    // Match the stable chrome/stage CSS box (`svh`/`svw`), not visualViewport
    // which jumps when mobile browser chrome shows/hides.
    const vw = this.root.clientWidth || window.innerWidth;
    const vh = this.root.clientHeight || window.innerHeight;
    this.root.setAttribute('viewBox', `0 0 ${vw} ${vh}`);

    const { itemId, showAsActive, showAsHover } = resolveConnectorItem(
      this.state,
    );

    if (prefersReducedMotion()) {
      this.root.style.opacity = '0';
      this.root.classList.add('is-idle');
      return;
    }

    if (!itemId || (!showAsActive && !showAsHover)) {
      this.targetOpacity = 0;
    } else {
      const item = getItemById(itemId);
      const anchor = this.navigation.getItemAnchor(itemId);
      if (!item || !anchor) {
        this.targetOpacity = 0;
      } else {
        this.projectAtom(item.atomId, this.scratch);
        if (!this.scratch.visible) {
          this.targetOpacity = 0;
        } else {
          this.targetOpacity = showAsActive ? 0.85 : 0.55;
        }
      }
    }

    // Zoom softens connector out of visual focus.
    this.targetOpacity *= 1 - this.zoomFade * 0.92;

    const opacityT = 1 - Math.exp(-OPACITY_FOLLOW * delta);
    this.opacity += (this.targetOpacity - this.opacity) * opacityT;

    if (this.pulse > 0) {
      this.pulse = Math.max(0, this.pulse - delta * 2.8);
    }

    const displayOpacity = Math.min(
      1,
      this.opacity + this.pulse * 0.35,
    );

    if (displayOpacity < 0.02 || !itemId) {
      this.root.style.opacity = '0';
      this.root.classList.add('is-idle');
      return;
    }

    const anchor = this.navigation.getItemAnchor(itemId);
    const item = getItemById(itemId);
    if (!anchor || !item) {
      this.root.style.opacity = '0';
      return;
    }

    this.projectAtom(item.atomId, this.scratch);
    // Sync with projected atom — no endpoint lag.
    const atomX = this.scratch.x;
    const atomY = this.scratch.y;

    const startX = anchor.x;
    const startY = anchor.y;
    const endX = atomX - ENDPOINT_GAP;
    const endY = atomY;

    const span = Math.max(0, endX - startX);
    const distanceFade =
      span > SOFT_FADE_SPAN_PX
        ? 1 / (1 + (span - SOFT_FADE_SPAN_PX) / 280)
        : 1;

    let points: string;
    if (span < MIN_ELBOW_RUN) {
      const stubX = startX + Math.max(span, 12);
      points = `${startX},${startY} ${stubX},${startY}`;
      this.endpoint.setAttribute('cx', String(stubX));
      this.endpoint.setAttribute('cy', String(startY));
    } else {
      // LABEL ──────┐
      //             │
      //             └──── ◉  (marker at tip, short of atom)
      const midX = startX + Math.min(span * 0.42, Math.max(span - 4, MIN_ELBOW_RUN));
      const elbowX = Math.min(midX, endX - 1);
      points = `${startX},${startY} ${elbowX},${startY} ${elbowX},${endY} ${endX},${endY}`;
      this.endpoint.setAttribute('cx', String(endX));
      this.endpoint.setAttribute('cy', String(endY));
    }

    this.line.setAttribute('points', points);
    this.root.style.opacity = String(displayOpacity * distanceFade);
    this.root.classList.toggle('is-idle', false);
    this.root.classList.toggle('is-active', showAsActive);
    this.root.classList.toggle('is-hover', showAsHover);
  }

  dispose(): void {
    this.unsubscribe();
    this.root.remove();
  }
}
