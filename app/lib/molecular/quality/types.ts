export type QualityLevel = 'high' | 'medium' | 'low';

export type QualityMaterialKind = 'standard' | 'lambert';

export type QualitySettings = {
  level: QualityLevel;
  maxPixelRatio: number;
  /** IcosahedronGeometry detail (0 = 20 faces, 1 = 80). */
  atomDetail: number;
  selectedWireframe: boolean;
  selectionRingCount: number;
  selectionTicks: boolean;
  /** Hub-centered peripheral orbit rings (cheap LineLoops). */
  decorativeOrbits: boolean;
  /** Ghost wire fragments (octahedron edges). */
  decorativeNodes: boolean;
  material: QualityMaterialKind;
  /** Dust rows: sparse bond thread + ambient shell (104–120); 0 disables. */
  particleCount: number;
  /** Additive fresnel edge on each atom (back-side shell). */
  atomRim: boolean;
  /** Comet arc travelling along the upcoming orbit. */
  orbitComet: boolean;
  /** Scroll-driven horizon ring on the frozen atom. */
  scanBand: boolean;
};

export type QualityListener = (settings: QualitySettings) => void;
