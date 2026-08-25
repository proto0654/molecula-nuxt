/// <reference types="vite/client" />

declare module 'troika-three-text' {
  import type { Color, Material, Mesh } from 'three';

  export class Text extends Mesh {
    text: string;
    fontSize: number;
    color: Color | string | number;
    anchorX: string | number;
    anchorY: string | number;
    maxWidth: number;
    material: Material;
    textRenderInfo: {
      blockBounds: [number, number, number, number];
    } | null;
    sync: (callback?: () => void) => void;
    dispose: () => void;
  }
}
