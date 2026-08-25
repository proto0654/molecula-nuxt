import { getItemById, navigationConfig } from '../navigation/navigationConfig';
import { NavigationState } from '../navigation/NavigationState';

export type MenuToggleListener = () => void;

/**
 * Site header: desktop LOGO / SYS / NODE; mobile LOGO + MENU / NAV.
 * Tablet keeps `.hud__meta` instead (header hidden via CSS).
 */
export class SiteHeader {
  readonly root: HTMLElement;
  private readonly nodeEl: HTMLElement;
  private readonly menuBtn: HTMLButtonElement;
  private readonly unsubscribe: () => void;
  private menuOpen = false;
  private onMenuToggle: MenuToggleListener | undefined;

  constructor(parent: HTMLElement, state: NavigationState) {
    this.root = document.createElement('header');
    this.root.className = 'site-header';

    const logo = document.createElement('span');
    logo.className = 'site-header__logo';
    logo.textContent = '[ МАРК ] ЛОГО';

    const sys = document.createElement('span');
    sys.className = 'site-header__sys';
    sys.textContent = '⟨ SYS · МОЛЕКУЛА ⟩';

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

    this.root.append(logo, sys, this.nodeEl, this.menuBtn);
    parent.append(this.root);

    this.unsubscribe = state.subscribe(() => {
      this.syncNode(state);
    });
    this.syncNode(state);
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
    this.root.remove();
  }
}
