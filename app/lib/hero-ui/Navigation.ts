import { navigationConfig } from '../navigation/navigationConfig';
import { NavigationState } from '../navigation/NavigationState';
import { HeroSlideProgress } from './HeroSlideProgress';
import { attachTapGuard } from './tapGuard';
import { prefersReducedMotion } from '../a11y/reducedMotion';

export type NavSelectListener = (itemId: string) => void;

/**
 * Minimal techno nav overlay. Hover previews; click is decided by the app layer.
 * Desktop: left vertical rail. Tablet/mobile: bottom bar.
 */
export class Navigation {
  readonly root: HTMLElement;
  private readonly state: NavigationState;
  private readonly itemElements = new Map<string, HTMLElement>();
  private readonly listEl: HTMLElement;
  private readonly rowEl: HTMLElement;
  private readonly slideProgress: HeroSlideProgress;
  private readonly unsubscribe: () => void;
  private readonly onSelect: NavSelectListener | undefined;

  constructor(
    parent: HTMLElement,
    state = new NavigationState(),
    onSelect?: NavSelectListener,
  ) {
    this.state = state;
    this.onSelect = onSelect;

    this.root = document.createElement('nav');
    this.root.className = 'nav';
    this.root.setAttribute('aria-label', 'Навигация сайта');

    const stackEl = document.createElement('div');
    stackEl.className = 'nav__stack';

    this.slideProgress = new HeroSlideProgress(stackEl, 'mobile');

    this.rowEl = document.createElement('div');
    this.rowEl.className = 'nav__row';

    const mark = document.createElement('span');
    mark.className = 'nav__mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '/ NAV';
    this.rowEl.append(mark);

    this.listEl = document.createElement('div');
    this.listEl.className = 'nav__list';

    navigationConfig.items.forEach((item, index) => {
      if (index > 0) {
        const sep = document.createElement('span');
        sep.className = 'nav__sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '·';
        this.listEl.append(sep);
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nav__item';
      button.dataset.navId = item.id;
      if (item.route) {
        button.dataset.route = item.route;
      }

      const idx = document.createElement('span');
      idx.className = 'nav__index';
      idx.textContent = String(index + 1).padStart(2, '0');

      const label = document.createElement('span');
      label.className = 'nav__label';
      label.textContent = item.label;

      button.append(idx, label);
      button.addEventListener('pointerenter', () => {
        this.state.setNavHover(item.id);
      });
      attachTapGuard(button, () => {
        this.onSelect?.(item.id);
      });
      this.listEl.append(button);
      this.itemElements.set(item.id, button);
    });

    this.rowEl.append(this.listEl);

    stackEl.append(this.rowEl);
    this.root.append(stackEl);

    this.root.addEventListener('pointerleave', () => {
      this.state.setNavHover(null);
    });

    parent.append(this.root);

    this.unsubscribe = this.state.subscribe(() => {
      const active = this.state.activeItemId;
      const committed = this.state.committedItemId;
      for (const [id, el] of this.itemElements) {
        el.classList.toggle('is-active', id === active);
        el.classList.toggle('is-committed', id === committed);
      }
      this.scrollActiveIntoView();
    });
  }

  get navigationState(): NavigationState {
    return this.state;
  }

  setSlideProgress(ratio: number): void {
    this.slideProgress.setProgress(ratio);
  }

  /**
   * Label right-edge mid-point in viewport CSS pixels (connector start).
   * Uses the label, not the full button width, so the line meets the text.
   */
  getItemAnchor(itemId: string): { x: number; y: number } | null {
    const el = this.itemElements.get(itemId);
    if (!el) return null;
    const label = el.querySelector('.nav__label') ?? el;
    const rect = label.getBoundingClientRect();
    if (rect.width <= 0 && rect.height <= 0) return null;
    return {
      x: rect.right + 10,
      y: rect.top + rect.height * 0.5,
    };
  }

  setZoomSoftness(amount: number): void {
    const t = Math.max(0, Math.min(1, amount));
    this.root.style.setProperty('--nav-zoom-fade', String(t));
  }

  private scrollActiveIntoView(): void {
    const id = this.state.committedItemId ?? this.state.activeItemId;
    if (!id) return;
    const el = this.itemElements.get(id);
    if (!el) return;
    // Only horizontal rails need this; desktop column is always fully visible.
    if (this.listEl.scrollWidth <= this.listEl.clientWidth + 1) return;
    el.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }

  dispose(): void {
    this.unsubscribe();
    this.slideProgress.dispose();
    this.root.remove();
  }
}
