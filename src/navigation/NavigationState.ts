import {
  navigationConfig,
  type NavigationConfig,
} from './navigationConfig';

export type NavigationListener = (atomId: string, index: number) => void;

export class NavigationState {
  private index: number;
  private readonly config: NavigationConfig;
  private readonly listeners = new Set<NavigationListener>();

  constructor(config: NavigationConfig = navigationConfig, startIndex = 0) {
    this.config = config;
    this.index = this.clampIndex(startIndex);
  }

  get currentIndex(): number {
    return this.index;
  }

  get currentAtomId(): string {
    return this.config.atomOrder[this.index] ?? '';
  }

  get count(): number {
    return this.config.atomOrder.length;
  }

  next(): string {
    if (this.count === 0) return '';
    const nextIndex = this.index + 1;
    if (nextIndex >= this.count) {
      this.index = this.config.loop ? 0 : this.count - 1;
    } else {
      this.index = nextIndex;
    }
    this.emit();
    return this.currentAtomId;
  }

  prev(): string {
    if (this.count === 0) return '';
    const prevIndex = this.index - 1;
    if (prevIndex < 0) {
      this.index = this.config.loop ? this.count - 1 : 0;
    } else {
      this.index = prevIndex;
    }
    this.emit();
    return this.currentAtomId;
  }

  setIndex(index: number): string {
    this.index = this.clampIndex(index);
    this.emit();
    return this.currentAtomId;
  }

  subscribe(listener: NavigationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private clampIndex(index: number): number {
    if (this.count === 0) return 0;
    return Math.max(0, Math.min(index, this.count - 1));
  }

  private emit(): void {
    const atomId = this.currentAtomId;
    for (const listener of this.listeners) {
      listener(atomId, this.index);
    }
  }
}
