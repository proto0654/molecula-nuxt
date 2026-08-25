import type { NavigationItem } from '../navigation/navigationConfig';

export type DestinationReturnListener = () => void;

/**
 * Stub destination shown after the overlay veil completes.
 * Swap later for a real route; Return always unwinds via the app layer.
 */
export class DestinationView {
  readonly root: HTMLElement;
  private readonly kickerEl: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly routeEl: HTMLElement;
  private readonly returnBtn: HTMLButtonElement;
  private onReturn: DestinationReturnListener | undefined;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'destination';
    this.root.hidden = true;
    this.root.setAttribute('aria-hidden', 'true');

    this.kickerEl = document.createElement('p');
    this.kickerEl.className = 'destination__kicker';
    this.kickerEl.textContent = '⟨ SECTION ⟩';

    this.titleEl = document.createElement('h1');
    this.titleEl.className = 'destination__title';

    this.routeEl = document.createElement('p');
    this.routeEl.className = 'destination__route';

    this.returnBtn = document.createElement('button');
    this.returnBtn.type = 'button';
    this.returnBtn.className = 'destination__return';
    this.returnBtn.textContent = '[ ← RETURN ]';
    this.returnBtn.addEventListener('click', () => {
      this.onReturn?.();
    });

    this.root.append(
      this.kickerEl,
      this.titleEl,
      this.routeEl,
      this.returnBtn,
    );
    parent.append(this.root);
  }

  setReturnHandler(listener: DestinationReturnListener): void {
    this.onReturn = listener;
  }

  show(item: NavigationItem): void {
    this.titleEl.textContent = `⟨ ${item.label.toUpperCase()} ⟩`;
    this.routeEl.textContent = `// ${item.route ?? '/'}`;
    this.root.hidden = false;
    this.root.setAttribute('aria-hidden', 'false');
  }

  hide(): void {
    this.root.hidden = true;
    this.root.setAttribute('aria-hidden', 'true');
  }

  dispose(): void {
    this.root.remove();
  }
}
