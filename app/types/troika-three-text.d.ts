declare module 'troika-three-text' {
  import type { Color, Material, Mesh } from 'three';

  export class Text extends Mesh {
    text: string;
    /** URL of a custom font (.ttf / .otf / .woff — not .woff2). */
    font: string | null;
    fontSize: number;
    color: Color | string | number;
    fillOpacity: number;
    anchorX: string | number;
    anchorY: string | number;
    maxWidth: number;
    /** `'normal'` soft-wraps at maxWidth; `'nowrap'` only breaks on explicit `\n`. */
    whiteSpace: 'normal' | 'nowrap';
    material: Material;
    textRenderInfo: {
      blockBounds: [number, number, number, number];
    } | null;
    sync: (callback?: () => void) => void;
    dispose: () => void;
  }
}

export {};
