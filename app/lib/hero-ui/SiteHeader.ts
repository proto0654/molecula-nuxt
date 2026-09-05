import type { HeroChromeCopy } from '../../domain/options/heroChromeCopy';
import { formatHudTemplate } from '../../domain/options/heroChromeCopy';
import { missingUiString } from '../../domain/options/missingUiString';
import {
  localeFromPath,
  alternateLocalePath,
  stripLocalePrefix,
  type SiteLocale,
} from '../../domain/i18n/locale';
import {
  getItemById,
  navigationConfig,
} from '../navigation/navigationConfig';
import { NavigationState } from '../navigation/NavigationState';
import { HeroSlideProgress } from './HeroSlideProgress';
import { createSiteLogoMark } from './siteLogoMark';
import { transitionTo } from '../navigation/TransitionController';
import { attachTapGuard } from './tapGuard';
import { registerChromeInfoSetter } from './chromeInfoBridge';

export type MenuToggleListener = () => void;
export type HeaderSelectListener = (itemId: string) => void;

/**
 * Site header: LOGO + LOCALE + route links (desktop/tablet) + NODE + MENU.
 * Locale switch + chrome INDEX use TransitionController (same SPA hop as menu/burger).
 * Home desktop slide progress is positioned at bottom center via CSS.
 */
export type SiteHeaderOptions = {
  /** Public asset base (Nuxt `app.baseURL`), e.g. `/` or `/molecula-nuxt/`. */
  assetBaseURL?: string;
};

export class SiteHeader {
  readonly root: HTMLElement;
  private readonly logoBtn: HTMLButtonElement;
  private readonly localeEl: HTMLElement;
  private readonly ruLink: HTMLAnchorElement;
  private readonly enLink: HTMLAnchorElement;
  private readonly slideProgress: HeroSlideProgress;
  private readonly routesEl: HTMLElement;
  private readonly linkElements = new Map<string, HTMLElement>();
  private readonly nodeEl: HTMLElement;
  private readonly chromeEl: HTMLElement;
  private readonly chromeLabelEl: HTMLElement;
  private readonly chromeLinkEl: HTMLAnchorElement;
  private readonly menuBtn: HTMLButtonElement;
  private readonly navState: NavigationState;
  private readonly unsubscribe: () => void;
  private menuOpen = false;
  private chromeCopy: HeroChromeCopy | null = null;
  private onMenuToggle: MenuToggleListener | undefined;
  private onSelect: HeaderSelectListener | undefined;

  private readonly onPopState = (): void => {
    this.syncLocale();
  };

  constructor(
    parent: HTMLElement,
    state: NavigationState,
    options: SiteHeaderOptions = {},
  ) {
    this.navState = state;
    const assetBase = options.assetBaseURL ?? '/';

    this.root = document.createElement('header');
    this.root.className = 'site-header';

    /* --- Logo --- */
    this.logoBtn = document.createElement('button');
    this.logoBtn.type = 'button';
    this.logoBtn.className = 'site-header__logo';
    this.logoBtn.append(createSiteLogoMark(assetBase));
    this.logoBtn.setAttribute('aria-label', missingUiString('hero_logo_alt'));
    attachTapGuard(this.logoBtn, () => {
      this.onSelect?.('home');
    });

    /* --- Locale switch (RU | ENG) --- */
    this.localeEl = document.createElement('span');
    this.localeEl.className = 'site-header__locale';

    this.ruLink = document.createElement('a');
    this.ruLink.className = 'site-header__locale-link';
    this.ruLink.textContent = 'RU';
    this.ruLink.lang = 'ru';
    this.attachSpaLink(this.ruLink);

    const sep = document.createElement('span');
    sep.className = 'site-header__locale-sep';
    sep.textContent = '|';

    this.enLink = document.createElement('a');
    this.enLink.className = 'site-header__locale-link';
    this.enLink.textContent = 'ENG';
    this.enLink.lang = 'en';
    this.attachSpaLink(this.enLink);

    this.localeEl.append(this.ruLink, sep, this.enLink);
    this.syncLocale();

    this.slideProgress = new HeroSlideProgress(this.root, 'desktop');

    /* --- Route links (desktop/tablet) --- */
    this.routesEl = document.createElement('nav');
    this.routesEl.className = 'site-header__routes';
    this.routesEl.setAttribute('aria-label', '');

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

    /* --- Node label (desktop/tablet route indicator) --- */
    this.nodeEl = document.createElement('span');
    this.nodeEl.className = 'site-header__node';

    /* --- Chrome slot (right side: route meta set via setChromeInfo) --- */
    this.chromeEl = document.createElement('span');
    this.chromeEl.className = 'site-header__chrome';

    this.chromeLabelEl = document.createElement('p');
    this.chromeLabelEl.className = 'site-header__chrome-label';

    this.chromeLinkEl = document.createElement('a');
    this.chromeLinkEl.className = 'site-header__chrome-link';
    this.attachSpaLink(this.chromeLinkEl);

    this.chromeEl.append(this.chromeLabelEl);

    registerChromeInfoSetter((label, href, text) => this.setChromeInfo(label, href, text));

    /* --- Mobile menu button --- */
    this.menuBtn = document.createElement('button');
    this.menuBtn.type = 'button';
    this.menuBtn.className = 'site-header__menu';
    this.menuBtn.setAttribute('aria-expanded', 'false');
    this.menuBtn.setAttribute('aria-controls', 'mobile-nav-overlay');
    this.menuBtn.textContent = '';
    this.menuBtn.addEventListener('click', () => {
      this.onMenuToggle?.();
    });

    this.root.append(
      this.logoBtn,
      this.localeEl,
      this.routesEl,
      this.nodeEl,
      this.chromeEl,
      this.menuBtn,
    );
    parent.append(this.root);

    this.unsubscribe = state.subscribe(() => {
      this.syncNode(state);
      this.syncLocale();
    });
    this.syncNode(state);
    this.syncRouteLinks();
    window.addEventListener('popstate', this.onPopState);
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
    this.syncMenuLabel();
    this.syncMenuAria();
    this.root.classList.toggle('is-menu-open', open);
  }

  setChromeCopy(copy: HeroChromeCopy): void {
    this.chromeCopy = copy;
    this.syncChromeCopy();
  }

  private syncChromeCopy(): void {
    const copy = this.chromeCopy;
    if (!copy) return;
    this.logoBtn.setAttribute('aria-label', copy.logoAriaLabel);
    if (copy.routesNavAriaLabel) {
      this.routesEl.setAttribute('aria-label', copy.routesNavAriaLabel);
    } else {
      this.routesEl.removeAttribute('aria-label');
    }
    this.syncMenuLabel();
    this.syncMenuAria();
    this.syncNode(this.navState);
  }

  private syncMenuLabel(): void {
    const copy = this.chromeCopy;
    if (!copy) {
      this.menuBtn.textContent = '';
      return;
    }
    this.menuBtn.textContent = this.menuOpen
      ? (copy.menuCloseLabel ?? missingUiString('hud_menu_close'))
      : (copy.menuOpenLabel ?? missingUiString('hud_menu_open'));
  }

  private syncMenuAria(): void {
    const copy = this.chromeCopy;
    if (!copy) return;
    this.menuBtn.setAttribute(
      'aria-label',
      this.menuOpen ? copy.menuCloseAriaLabel : copy.menuOpenAriaLabel,
    );
  }

  get isMenuOpen(): boolean {
    return this.menuOpen;
  }

  setSlideProgress(ratio: number): void {
    this.slideProgress.setProgress(ratio);
  }

  syncNavigationCopy(): void {
    for (const [id, el] of this.linkElements) {
      const item = getItemById(id);
      if (!item) continue;
      const label = el.querySelector('.site-header__link-label');
      if (label) label.textContent = item.label;
    }
    this.syncNode(this.navState);
    this.syncRouteLinks();
    this.syncLocale();
  }

  /**
   * Set the right-side chrome info (e.g. "ARCHIVE / SERVICES" or "CASE / 03" + INDEX link).
   * Called by SiteChrome.vue on mount/update. Pass nulls to clear.
   */
  setChromeInfo(label: string | null, linkHref?: string | null, linkText?: string | null): void {
    this.chromeLabelEl.textContent = label ?? '';
    this.chromeLabelEl.style.display = label ? '' : 'none';

    if (linkHref && linkText) {
      this.chromeLinkEl.href = linkHref;
      this.chromeLinkEl.textContent = linkText;
      if (!this.chromeLinkEl.isConnected) this.chromeEl.append(this.chromeLinkEl);
    } else {
      this.chromeLinkEl.remove();
      this.chromeLinkEl.removeAttribute('href');
      this.chromeLinkEl.textContent = '';
    }
  }

  /** Left-click → TransitionController; modified clicks keep native browser behavior. */
  private attachSpaLink(el: HTMLAnchorElement): void {
    el.addEventListener('click', (event) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const href = el.getAttribute('href');
      if (!href) return;
      event.preventDefault();
      void transitionTo(href).then(() => {
        this.syncLocale();
        this.syncRouteLinks();
      });
    });
  }

  /** Update locale links from current URL. Call after any navigation. */
  syncLocale(): void {
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    const current: SiteLocale = localeFromPath(path);

    this.ruLink.classList.toggle('is-active', current === 'ru');
    this.enLink.classList.toggle('is-active', current === 'en');
    this.ruLink.href = alternateLocalePath(path, 'ru');
    this.enLink.href = alternateLocalePath(path, 'en');
    if (current === 'ru') {
      this.ruLink.setAttribute('aria-current', 'page');
      this.enLink.removeAttribute('aria-current');
    } else {
      this.enLink.setAttribute('aria-current', 'page');
      this.ruLink.removeAttribute('aria-current');
    }
    this.syncRouteLinks();
  }

  /** Top routes: direct SPA hops — no molecule active/committed chrome. */
  syncRouteLinks(): void {
    const path =
      typeof window !== 'undefined'
        ? stripLocalePrefix(window.location.pathname)
        : '/';
    const normalized = path.replace(/\/$/, '') || '/';

    for (const [id, el] of this.linkElements) {
      el.classList.remove('is-active', 'is-committed');
      const item = getItemById(id);
      if (!item?.route) {
        el.removeAttribute('aria-current');
        continue;
      }
      const route = stripLocalePrefix(item.route).replace(/\/$/, '') || '/';
      const matches =
        route === '/'
          ? normalized === '/'
          : normalized === route || normalized.startsWith(`${route}/`);
      if (matches) {
        el.setAttribute('aria-current', 'page');
      } else {
        el.removeAttribute('aria-current');
      }
    }
  }

  private syncNode(state: NavigationState): void {
    const copy = this.chromeCopy;
    const id = state.committedItemId ?? state.activeItemId;
    if (!copy) {
      this.nodeEl.textContent = '';
      return;
    }
    if (!id) {
      this.nodeEl.textContent = copy.nodeIdle ?? '';
      return;
    }
    const item = getItemById(id);
    const index = navigationConfig.items.findIndex((entry) => entry.id === id);
    const nn = String(index + 1).padStart(2, '0');
    const label = (item?.label ?? id).toUpperCase();
    const template = copy.nodeFormat ?? missingUiString('hud_node_format');
    this.nodeEl.textContent = formatHudTemplate(template, { nn, label });
  }

  dispose(): void {
    window.removeEventListener('popstate', this.onPopState);
    this.unsubscribe();
    this.slideProgress.dispose();
    this.root.remove();
  }
}
