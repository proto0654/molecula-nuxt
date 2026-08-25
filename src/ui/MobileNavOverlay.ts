import { navigationConfig } from '../navigation/navigationConfig';
import { NavigationState } from '../navigation/NavigationState';
import type { NavSelectListener } from './Navigation';
import { attachTapGuard } from './tapGuard';

/**
 * Editorial full-screen mobile nav. Not a card — veil + numbered list + status.
 */
export class MobileNavOverlay {
  readonly root: HTMLElement;
  private readonly state: NavigationState;
  private readonly listEl: HTMLElement;
  private readonly statusNode: HTMLElement;
  private readonly statusSignal: HTMLElement;
  private readonly itemElements = new Map<string, HTMLElement>();
  private readonly unsubscribe: () => void;
  private readonly onSelect: NavSelectListener | undefined;
  private readonly onCloseRequest: (() => void) | undefined;
  private readonly onKeyDownBound: (event: KeyboardEvent) => void;
  private open = false;

  constructor(
    parent: HTMLElement,
    state: NavigationState,
    options?: {
      onSelect?: NavSelectListener;
      onClose?: () => void;
    },
  ) {
    this.state = state;
    this.onSelect = options?.onSelect;
    this.onCloseRequest = options?.onClose;

    this.root = document.createElement('div');
    this.root.id = 'mobile-nav-overlay';
    this.root.className = 'mobile-nav-overlay';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Navigation');
    this.root.setAttribute('aria-hidden', 'true');
    this.root.hidden = true;

    const frame = document.createElement('div');
    frame.className = 'mobile-nav-overlay__frame';

    const crosshair = document.createElement('div');
    crosshair.className = 'mobile-nav-overlay__crosshair';
    crosshair.setAttribute('aria-hidden', 'true');

    const header = document.createElement('div');
    header.className = 'mobile-nav-overlay__header';
    const kicker = document.createElement('span');
    kicker.textContent = '/ NAV INDEX';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'mobile-nav-overlay__close';
    closeBtn.textContent = '[ CLOSE ]';
    closeBtn.addEventListener('click', () => this.requestClose());
    header.append(kicker, closeBtn);

    this.listEl = document.createElement('div');
    this.listEl.className = 'mobile-nav-overlay__list';

    navigationConfig.items.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mobile-nav-overlay__item';
      button.dataset.navId = item.id;

      const idx = document.createElement('span');
      idx.className = 'mobile-nav-overlay__index';
      idx.textContent = String(index + 1).padStart(2, '0');

      const label = document.createElement('span');
      label.className = 'mobile-nav-overlay__label';
      label.textContent = item.label;

      button.append(idx, label);
      attachTapGuard(button, () => {
        this.onSelect?.(item.id);
      });
      this.listEl.append(button);
      this.itemElements.set(item.id, button);
    });

    const status = document.createElement('div');
    status.className = 'mobile-nav-overlay__status';
    status.setAttribute('aria-hidden', 'true');
    this.statusNode = document.createElement('span');
    this.statusSignal = document.createElement('span');
    status.append(this.statusNode, this.statusSignal);

    frame.append(crosshair, header, this.listEl, status);
    this.root.append(frame);

    this.root.addEventListener('click', (event) => {
      if (event.target === this.root) this.requestClose();
    });

    parent.append(this.root);

    this.onKeyDownBound = (event: KeyboardEvent) => {
      if (!this.open) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.requestClose();
      }
    };
    window.addEventListener('keydown', this.onKeyDownBound);

    this.unsubscribe = this.state.subscribe(() => {
      this.sync();
    });
    this.sync();
  }

  get isOpen(): boolean {
    return this.open;
  }

  setOpen(next: boolean): void {
    if (this.open === next) return;
    this.open = next;
    this.root.hidden = !next;
    this.root.setAttribute('aria-hidden', next ? 'false' : 'true');
    this.root.classList.toggle('is-open', next);
    document.documentElement.classList.toggle('nav-overlay-open', next);
    if (next) {
      this.state.setNavHover(null);
      const active =
        this.itemElements.get(
          this.state.committedItemId ?? this.state.activeItemId ?? '',
        ) ?? this.listEl.querySelector('button');
      if (active instanceof HTMLElement) active.focus();
    } else {
      this.state.setNavHover(null);
    }
  }

  toggle(): void {
    this.setOpen(!this.open);
  }

  private requestClose(): void {
    this.onCloseRequest?.();
  }

  private sync(): void {
    const active = this.state.activeItemId;
    const committed = this.state.committedItemId;
    for (const [id, el] of this.itemElements) {
      el.classList.toggle('is-active', id === active);
      el.classList.toggle('is-committed', id === committed);
    }
    const id = committed ?? active;
    if (!id) {
      this.statusNode.textContent = 'NODE --';
      this.statusSignal.textContent = 'STATUS IDLE';
      return;
    }
    const index = navigationConfig.items.findIndex((entry) => entry.id === id);
    this.statusNode.textContent = `NODE ${String(index + 1).padStart(2, '0')}`;
    this.statusSignal.textContent = committed
      ? 'STATUS ACTIVE'
      : 'STATUS READY';
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDownBound);
    document.documentElement.classList.remove('nav-overlay-open');
    this.unsubscribe();
    this.root.remove();
  }
}
