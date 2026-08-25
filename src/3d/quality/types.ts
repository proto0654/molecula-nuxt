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
  decorativeNodes: boolean;
  material: QualityMaterialKind;
};

export type QualityListener = (settings: QualitySettings) => void;
