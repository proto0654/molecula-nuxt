import { navigationConfig } from '../navigation/navigationConfig';
import { NavigationState } from '../navigation/NavigationState';

export type NavSelectListener = (itemId: string) => void;

/**
 * Minimal techno nav overlay. Hover previews; click is decided by the app layer.
 */
export class Navigation {
  readonly root: HTMLElement;
  private readonly state: NavigationState;
  private readonly itemElements = new Map<string, HTMLElement>();
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
    this.root.setAttribute('aria-label', 'Site navigation');

    const mark = document.createElement('span');
    mark.className = 'nav__mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '⟨ NAV ⟩';
    this.root.append(mark);

    const list = document.createElement('div');
    list.className = 'nav__list';

    navigationConfig.items.forEach((item, index) => {
      if (index > 0) {
        const sep = document.createElement('span');
        sep.className = 'nav__sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '·';
        list.append(sep);
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
      button.addEventListener('click', () => {
        this.onSelect?.(item.id);
      });
      list.append(button);
      this.itemElements.set(item.id, button);
    });

    this.root.append(list);
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
    });
  }

  get navigationState(): NavigationState {
    return this.state;
  }

  dispose(): void {
    this.unsubscribe();
    this.root.remove();
  }
}
