/// <reference types="vite/client" />

declare module 'troika-three-text' {
  import type { Color, Material, Mesh } from 'three';

  export class Text extends Mesh {
    text: string;
    fontSize: number;
    color: Color | string | number;
    anchorX: string | number;
    anchorY: string | number;
    material: Material;
    sync: (callback?: () => void) => void;
    dispose: () => void;
  }
}
