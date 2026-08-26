import { QUALITY_PRESETS, isQualityLevel } from './presets';
import type { QualityLevel, QualityListener, QualitySettings } from './types';

const MOBILE_MAX_WIDTH = 767;

export function readQualitySearchParam(
  search = window.location.search,
): QualityLevel | null {
  const value = new URLSearchParams(search).get('quality');
  return isQualityLevel(value) ? value : null;
}

/**
 * HIGH on desktop; MEDIUM on coarse-pointer / narrow viewports so the
 * startup sample does not begin at a janky HIGH burst on phones.
 * `?quality=` wins over the heuristic.
 */
export function detectStartLevel(): QualityLevel {
  const override = readQualitySearchParam();
  if (override) return override;

  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (coarse || window.innerWidth <= MOBILE_MAX_WIDTH) {
    return 'medium';
  }
  return 'high';
}

export class QualityManager {
  private settings: QualitySettings;
  private readonly listeners = new Set<QualityListener>();

  constructor(level: QualityLevel = detectStartLevel()) {
    this.settings = QUALITY_PRESETS[level];
  }

  get(): QualitySettings {
    return this.settings;
  }

  setLevel(level: QualityLevel): void {
    if (this.settings.level === level) return;
    this.settings = QUALITY_PRESETS[level];
    for (const listener of this.listeners) {
      listener(this.settings);
    }
  }

  subscribe(listener: QualityListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
