import {
  getItemById,
  navigationConfig,
} from '../navigation/navigationConfig';
import { NavigationState } from '../navigation/NavigationState';
import { HeroSlideProgress } from './HeroSlideProgress';
import { createSiteLogoMark } from './siteLogoMark';
import { attachTapGuard } from './tapGuard';

export type MenuToggleListener = () => void;
export type HeaderSelectListener = (itemId: string) => void;

/**
 * Site header: LOGO + route links (desktop/tablet) + NODE; mobile MENU (home + off-home).
 * Home desktop slide progress is positioned at bottom center via CSS.
 * Route links: one-shot leave from home (orbit+zoom then route); off-home hops immediately.
 */
export type SiteHeaderOptions = {
  /** Public asset base (Nuxt `app.baseURL`), e.g. `/` or `/molecula-nuxt/`. */
  assetBaseURL?: string;
};

export class SiteHeader {
  readonly root: HTMLElement;
  private readonly logoBtn: HTMLButtonElement;
  private readonly slideProgress: HeroSlideProgress;
  private readonly routesEl: HTMLElement;
  private readonly linkElements = new Map<string, HTMLElement>();
  private readonly nodeEl: HTMLElement;
  private readonly menuBtn: HTMLButtonElement;
  private readonly unsubscribe: () => void;
  private menuOpen = false;
  private onMenuToggle: MenuToggleListener | undefined;
  private onSelect: HeaderSelectListener | undefined;

  constructor(
    parent: HTMLElement,
    state: NavigationState,
    options: SiteHeaderOptions = {},
  ) {
    const assetBase = options.assetBaseURL ?? '/';

    this.root = document.createElement('header');
    this.root.className = 'site-header';

    this.logoBtn = document.createElement('button');
    this.logoBtn.type = 'button';
    this.logoBtn.className = 'site-header__logo';
    this.logoBtn.append(createSiteLogoMark(assetBase));
    this.logoBtn.setAttribute('aria-label', 'WebLaba, на главную');
    attachTapGuard(this.logoBtn, () => {
      this.onSelect?.('home');
    });

    this.slideProgress = new HeroSlideProgress(this.root, 'desktop');

    this.routesEl = document.createElement('nav');
    this.routesEl.className = 'site-header__routes';
    this.routesEl.setAttribute('aria-label', 'Разделы сайта');

    navigationConfig.items.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'site-header__link';
      button.dataset.navId = item.id;
      if (item.route) button.dataset.route = item.route;

      const idx = document.createElement('span');
      idx.className = 'site-header__link-index';
      idx.textContent = String(index + 1).padStart(2, '0');

      const label = document.createElement('span');
      label.className = 'site-header__link-label';
      label.textContent = item.label;

      button.append(idx, label);
      attachTapGuard(button, () => {
        this.onSelect?.(item.id);
      });
      this.routesEl.append(button);
      this.linkElements.set(item.id, button);
    });

    this.nodeEl = document.createElement('span');
    this.nodeEl.className = 'site-header__node';

    this.menuBtn = document.createElement('button');
    this.menuBtn.type = 'button';
    this.menuBtn.className = 'site-header__menu';
    this.menuBtn.setAttribute('aria-expanded', 'false');
    this.menuBtn.setAttribute('aria-controls', 'mobile-nav-overlay');
    this.menuBtn.textContent = 'МЕНЮ / NAV';
    this.menuBtn.addEventListener('click', () => {
      this.onMenuToggle?.();
    });

    this.root.append(
      this.logoBtn,
      this.routesEl,
      this.nodeEl,
      this.menuBtn,
    );
    parent.append(this.root);

    this.unsubscribe = state.subscribe(() => {
      this.syncNode(state);
      this.syncLinks(state);
    });
    this.syncNode(state);
    this.syncLinks(state);
  }

  onSelectItem(listener: HeaderSelectListener): void {
    this.onSelect = listener;
  }

  onToggleMenu(listener: MenuToggleListener): void {
    this.onMenuToggle = listener;
  }

  setMenuOpen(open: boolean): void {
    this.menuOpen = open;
    this.menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    this.menuBtn.textContent = open ? 'ЗАКРЫТЬ / NAV' : 'МЕНЮ / NAV';
    this.root.classList.toggle('is-menu-open', open);
  }

  get isMenuOpen(): boolean {
    return this.menuOpen;
  }

  setSlideProgress(ratio: number): void {
    this.slideProgress.setProgress(ratio);
  }

  private syncLinks(state: NavigationState): void {
    const active = state.activeItemId;
    const committed = state.committedItemId;
    for (const [id, el] of this.linkElements) {
      el.classList.toggle('is-active', id === active);
      el.classList.toggle('is-committed', id === committed);
      if (id === committed) {
        el.setAttribute('aria-current', 'page');
      } else {
        el.removeAttribute('aria-current');
      }
    }
  }

  private syncNode(state: NavigationState): void {
    const id = state.committedItemId ?? state.activeItemId;
    if (!id) {
      this.nodeEl.textContent = 'УЗЕЛ -- / ПРОСТОЙ';
      return;
    }
    const item = getItemById(id);
    const index = navigationConfig.items.findIndex((entry) => entry.id === id);
    const node = String(index + 1).padStart(2, '0');
    const label = (item?.label ?? id).toUpperCase();
    this.nodeEl.textContent = `УЗЕЛ ${node} / ${label}`;
  }

  dispose(): void {
    this.unsubscribe();
    this.slideProgress.dispose();
    this.root.remove();
  }
}
