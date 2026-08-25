/**
 * Techno HUD chrome: edge grid + corner ticks. Pointer-events none.
 */
export class HudFrame {
  readonly root: HTMLElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.setAttribute('aria-hidden', 'true');

    const grid = document.createElement('div');
    grid.className = 'hud__grid';

    const frame = document.createElement('div');
    frame.className = 'hud__frame';
    for (const corner of ['tl', 'tr', 'bl', 'br'] as const) {
      const tick = document.createElement('span');
      tick.className = `hud__corner hud__corner--${corner}`;
      frame.append(tick);
    }

    const meta = document.createElement('p');
    meta.className = 'hud__meta';
    meta.textContent = 'SYS // MOLECULE';

    this.root.append(grid, frame, meta);
    parent.append(this.root);
  }

  dispose(): void {
    this.root.remove();
  }
}
