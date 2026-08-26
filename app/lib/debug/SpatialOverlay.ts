/** Flip to `false` to hide the overlay in dev without a query param. */
export const DEBUG_SPATIAL = true;

function isOverlayEnabled(): boolean {
  if (!import.meta.dev) return false;
  if (!DEBUG_SPATIAL) return false;
  const debug = new URLSearchParams(window.location.search).get('debug');
  if (debug === '0' || debug === 'false') return false;
  return true;
}

export type SpatialDebugSnapshot = {
  mode: string;
  target: string | null;
  context?: string;
  entityId?: string;
  instanceId: number;
};

function contextLabel(context?: string): string {
  if (context === 'portfolio') return 'WORK';
  if (context === 'services') return 'SERVICES';
  return context ? context.toUpperCase() : '—';
}

/**
 * Dev-only spatial state readout. Easily killed via `DEBUG_SPATIAL` or `?debug=0`.
 */
export class SpatialOverlay {
  private readonly root: HTMLPreElement;

  static tryCreate(parent: HTMLElement): SpatialOverlay | null {
    if (!isOverlayEnabled()) return null;
    return new SpatialOverlay(parent);
  }

  private constructor(parent: HTMLElement) {
    this.root = document.createElement('pre');
    this.root.className = 'spatial-overlay';
    this.root.setAttribute('aria-hidden', 'true');
    parent.append(this.root);
  }

  set(snapshot: SpatialDebugSnapshot): void {
    const mode = snapshot.mode.replace(/-/g, ' ').toUpperCase();
    const target = snapshot.target?.toUpperCase() ?? '—';
    const entity = snapshot.entityId ?? '—';
    this.root.textContent =
      `MODE     ${mode}\n` +
      `TARGET   ${target}\n` +
      `CONTEXT  ${contextLabel(snapshot.context)}\n` +
      `ENTITY   ${entity}\n` +
      `INSTANCE ${snapshot.instanceId}`;
  }

  dispose(): void {
    this.root.remove();
  }
}
