import type { HeroChromeCopy } from '../../domain/options/heroChromeCopy';
import { missingUiString } from '../../domain/options/missingUiString';

/**
 * Techno HUD chrome: edge grid, corner ticks.
 * Pointer-events none.
 */
export class HudFrame {
  readonly root: HTMLElement;
  private readonly metaEl: HTMLElement;

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

    this.metaEl = document.createElement('p');
    this.metaEl.className = 'hud__meta';
    this.metaEl.textContent = missingUiString('hud_sys_meta');

    this.root.append(grid, frame, this.metaEl);
    parent.append(this.root);
  }

  setChromeCopy(copy: HeroChromeCopy): void {
    this.metaEl.textContent = copy.sysMeta;
  }

  dispose(): void {
    this.root.remove();
  }
}
