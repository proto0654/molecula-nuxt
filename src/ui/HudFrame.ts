/**
 * Techno HUD chrome: edge grid, corner ticks, coord marks.
 * Guide crosshair lives in WebGL (`CompositionGuides`) behind the molecule.
 * Pointer-events none.
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

    const coords = document.createElement('div');
    coords.className = 'hud__coords';
    for (const mark of [
      { className: 'hud__coord hud__coord--tl', text: '0.0' },
      { className: 'hud__coord hud__coord--tr', text: '1.0' },
      { className: 'hud__coord hud__coord--bl', text: '0.0' },
      { className: 'hud__coord hud__coord--br', text: '1.0' },
    ] as const) {
      const el = document.createElement('span');
      el.className = mark.className;
      el.textContent = mark.text;
      coords.append(el);
    }

    const meta = document.createElement('p');
    meta.className = 'hud__meta';
    meta.textContent = 'SYS // MOLECULE';

    this.root.append(grid, frame, coords, meta);
    parent.append(this.root);
  }

  dispose(): void {
    this.root.remove();
  }
}
