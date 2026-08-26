import type { QualityLevel, QualitySettings } from './types';

export const QUALITY_PRESETS: Record<QualityLevel, QualitySettings> = {
  high: {
    level: 'high',
    maxPixelRatio: 1.75,
    atomDetail: 1,
    selectedWireframe: true,
    selectionRingCount: 3,
    selectionTicks: true,
    decorativeNodes: true,
    material: 'standard',
  },
  medium: {
    level: 'medium',
    maxPixelRatio: 1.5,
    atomDetail: 1,
    selectedWireframe: true,
    selectionRingCount: 2,
    selectionTicks: false,
    decorativeNodes: false,
    material: 'standard',
  },
  low: {
    level: 'low',
    maxPixelRatio: 1,
    atomDetail: 0,
    selectedWireframe: false,
    selectionRingCount: 2,
    selectionTicks: false,
    decorativeNodes: false,
    material: 'lambert',
  },
};

const LEVEL_RANK: Record<QualityLevel, number> = {
  high: 2,
  medium: 1,
  low: 0,
};

/** Returns the lower of two levels (never an upgrade). */
export function minQualityLevel(a: QualityLevel, b: QualityLevel): QualityLevel {
  return LEVEL_RANK[a] <= LEVEL_RANK[b] ? a : b;
}

export function downgradeQuality(level: QualityLevel): QualityLevel {
  if (level === 'high') return 'medium';
  if (level === 'medium') return 'low';
  return 'low';
}

export function isQualityLevel(value: string | null): value is QualityLevel {
  return value === 'high' || value === 'medium' || value === 'low';
}
