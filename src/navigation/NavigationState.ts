import {
  getItemByAtomId,
  getItemById,
  navigationConfig,
  type NavigationConfig,
  type NavigationItem,
} from './navigationConfig';

export type NavigationListener = (
  activeItemId: string | null,
  item: NavigationItem | null,
) => void;

/**
 * Single source of truth for which nav item is active.
 * Dual hover sources so canvas raycast `null` does not wipe overlay nav hover.
 * Effective: navHover ?? atomHover ?? committed.
 */
export class NavigationState {
  private navHoverItemId: string | null = null;
  private atomHoverItemId: string | null = null;
  private committedItemId: string | null = null;
  private readonly config: NavigationConfig;
  private readonly listeners = new Set<NavigationListener>();

  constructor(config: NavigationConfig = navigationConfig) {
    this.config = config;
  }

  get activeItemId(): string | null {
    return this.navHoverItemId ?? this.atomHoverItemId ?? this.committedItemId;
  }

  get activeItem(): NavigationItem | null {
    const id = this.activeItemId;
    return id ? (getItemById(id) ?? null) : null;
  }

  setNavHover(itemId: string | null): void {
    const next =
      itemId && this.config.items.some((item) => item.id === itemId)
        ? itemId
        : null;
    if (next === this.navHoverItemId) return;
    this.navHoverItemId = next;
    this.emit();
  }

  setAtomHover(atomId: string | null): void {
    const next = atomId ? (getItemByAtomId(atomId)?.id ?? null) : null;
    if (next === this.atomHoverItemId) return;
    this.atomHoverItemId = next;
    this.emit();
  }

  /** Optional commit for “restore pre-hover”; unused by hover-only UI for now. */
  setCommitted(itemId: string | null): void {
    const next =
      itemId && this.config.items.some((item) => item.id === itemId)
        ? itemId
        : null;
    if (next === this.committedItemId) return;
    this.committedItemId = next;
    this.emit();
  }

  subscribe(listener: NavigationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const id = this.activeItemId;
    const item = id ? (getItemById(id) ?? null) : null;
    for (const listener of this.listeners) {
      listener(id, item);
    }
  }
}
