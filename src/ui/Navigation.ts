import { NavigationState } from '../navigation/NavigationState';

export class Navigation {
  readonly root: HTMLElement;
  private readonly state: NavigationState;
  private readonly label: HTMLElement;
  private readonly unsubscribe: () => void;

  constructor(parent: HTMLElement, state = new NavigationState()) {
    this.state = state;

    this.root = document.createElement('nav');
    this.root.className = 'nav';
    this.root.setAttribute('aria-label', 'Atom navigation');

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'nav__btn';
    prev.textContent = 'Prev';
    prev.addEventListener('click', () => this.state.prev());

    this.label = document.createElement('span');
    this.label.className = 'nav__label';

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'nav__btn';
    next.textContent = 'Next';
    next.addEventListener('click', () => this.state.next());

    this.root.append(prev, this.label, next);
    parent.append(this.root);

    this.unsubscribe = this.state.subscribe((atomId, index) => {
      this.label.textContent = `${atomId} (${index + 1}/${this.state.count})`;
    });

    // Initial label
    this.label.textContent = `${this.state.currentAtomId} (1/${this.state.count})`;
  }

  get navigationState(): NavigationState {
    return this.state;
  }

  dispose(): void {
    this.unsubscribe();
    this.root.remove();
  }
}
