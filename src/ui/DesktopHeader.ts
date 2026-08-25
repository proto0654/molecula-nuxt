import { getItemById, navigationConfig } from '../navigation/navigationConfig';
import { NavigationState } from '../navigation/NavigationState';

/**
 * Light desktop header overlay: logo placeholder + system / node metadata.
 * Pointer-events none. Hidden below desktop breakpoint via CSS.
 */
export class DesktopHeader {
  readonly root: HTMLElement;
  private readonly nodeEl: HTMLElement;
  private readonly unsubscribe: () => void;

  constructor(parent: HTMLElement, state: NavigationState) {
    this.root = document.createElement('header');
    this.root.className = 'desktop-header';
    this.root.setAttribute('aria-hidden', 'true');

    const logo = document.createElement('span');
    logo.className = 'desktop-header__logo';
    logo.textContent = '[ MARK ] LOGO';

    const sys = document.createElement('span');
    sys.className = 'desktop-header__sys';
    sys.textContent = 'SYS // MOLECULE';

    this.nodeEl = document.createElement('span');
    this.nodeEl.className = 'desktop-header__node';

    this.root.append(logo, sys, this.nodeEl);
    parent.append(this.root);

    this.unsubscribe = state.subscribe(() => {
      this.syncNode(state);
    });
    this.syncNode(state);
  }

  private syncNode(state: NavigationState): void {
    const id = state.committedItemId ?? state.activeItemId;
    if (!id) {
      this.nodeEl.textContent = 'NODE -- / IDLE';
      return;
    }
    const item = getItemById(id);
    const index = navigationConfig.items.findIndex((entry) => entry.id === id);
    const node = String(index + 1).padStart(2, '0');
    const label = (item?.label ?? id).toUpperCase();
    this.nodeEl.textContent = `NODE ${node} / ${label}`;
  }

  dispose(): void {
    this.unsubscribe();
    this.root.remove();
  }
}
