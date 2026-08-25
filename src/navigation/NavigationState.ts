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
 * Dual hover sources so canvas raycast `null` does not wipe a nav hover.
 *
 * Effective highlight: atomHover ?? navHover ?? committed
 * Focus: committed only (click). Hover never centers the molecule.
 */
export class NavigationState {
  private atomHoverItemId: string | null = null;
  private navHoverItemId: string | null = null;
  private committedItemIdInternal: string | null = null;
  private readonly config: NavigationConfig;
  private readonly listeners = new Set<NavigationListener>();

  constructor(config: NavigationConfig = navigationConfig) {
    this.config = config;
  }

  get activeItemId(): string | null {
    return this.atomHoverItemId ?? this.navHoverItemId ?? this.committedItemIdInternal;
  }

  get activeItem(): NavigationItem | null {
    const id = this.activeItemId;
    return id ? (getItemById(id) ?? null) : null;
  }

  get previewItemId(): string | null {
    return this.atomHoverItemId ?? this.navHoverItemId;
  }

  get committedItemId(): string | null {
    return this.committedItemIdInternal;
  }

  /** Orientation target — first click commit only. Hover never focuses. */
  get focusItemId(): string | null {
    return this.committedItemIdInternal;
  }

  setAtomHover(atomId: string | null): void {
    const next = atomId ? (getItemByAtomId(atomId)?.id ?? null) : null;
    if (next === this.atomHoverItemId) return;
    this.atomHoverItemId = next;
    this.emit();
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

  /** Sticky selection from first click — drives focus + typewriter blurb (not zoom). */
  setCommitted(itemId: string | null): void {
    const next =
      itemId && this.config.items.some((item) => item.id === itemId)
        ? itemId
        : null;
    if (next === this.committedItemIdInternal) return;
    this.committedItemIdInternal = next;
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
