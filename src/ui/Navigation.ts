import { navigationConfig } from '../navigation/navigationConfig';
import { NavigationState } from '../navigation/NavigationState';

export class Navigation {
  readonly root: HTMLElement;
  private readonly state: NavigationState;
  private readonly itemElements = new Map<string, HTMLElement>();
  private readonly unsubscribe: () => void;

  constructor(parent: HTMLElement, state = new NavigationState()) {
    this.state = state;

    this.root = document.createElement('nav');
    this.root.className = 'nav';
    this.root.setAttribute('aria-label', 'Site navigation');

    for (const item of navigationConfig.items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nav__item';
      button.textContent = item.label;
      button.dataset.navId = item.id;
      if (item.route) {
        button.dataset.route = item.route;
      }
      button.addEventListener('pointerenter', () => {
        this.state.setNavHover(item.id);
      });
      this.root.append(button);
      this.itemElements.set(item.id, button);
    }

    this.root.addEventListener('pointerleave', () => {
      this.state.setNavHover(null);
    });

    parent.append(this.root);

    this.unsubscribe = this.state.subscribe((activeItemId) => {
      for (const [id, el] of this.itemElements) {
        el.classList.toggle('is-active', id === activeItemId);
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
