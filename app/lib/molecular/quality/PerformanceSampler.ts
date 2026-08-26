import { downgradeQuality, minQualityLevel } from './presets';
import type { QualityManager } from './QualityManager';
import type { QualityLevel } from './types';

const WARMUP_FRAMES = 8;
const SAMPLE_FRAMES = 45;
const WATCH_SECONDS = 2;
const WATCH_CAP = 180;

const P95_HIGH_MS = 18;
const P95_MEDIUM_MS = 28;

type SamplerPhase = 'warmup' | 'sampling' | 'watching' | 'done';

/**
 * One-shot startup sample. Not a live adaptive scaler.
 * After lock, at most one extra downgrade during a short watch window.
 */
export class PerformanceSampler {
  private phase: SamplerPhase;
  private warmupLeft = WARMUP_FRAMES;
  private sampleCount = 0;
  private watchElapsed = 0;
  private watchCount = 0;
  private watchWrite = 0;
  private readonly cap: QualityLevel;
  private readonly quality: QualityManager;
  private readonly sample = new Float32Array(SAMPLE_FRAMES);
  private readonly watch = new Float32Array(WATCH_CAP);
  private readonly sortBuf = new Float32Array(WATCH_CAP);

  constructor(
    quality: QualityManager,
    options: { skip: boolean; cap: QualityLevel },
  ) {
    this.quality = quality;
    this.cap = options.cap;
    this.phase = options.skip ? 'done' : 'warmup';
  }

  get done(): boolean {
    return this.phase === 'done';
  }

  /**
   * Record one frame. `deltaSeconds` is the rAF delta already clamped in `tick`.
   */
  tick(deltaSeconds: number): void {
    if (this.phase === 'done') return;

    const frameMs = deltaSeconds * 1000;

    if (this.phase === 'warmup') {
      this.warmupLeft -= 1;
      if (this.warmupLeft <= 0) this.phase = 'sampling';
      return;
    }

    if (this.phase === 'sampling') {
      this.sample[this.sampleCount] = frameMs;
      this.sampleCount += 1;
      if (this.sampleCount >= SAMPLE_FRAMES) {
        const p95 = percentile95(this.sample, this.sampleCount, this.sortBuf);
        const chosen = minQualityLevel(levelFromP95(p95), this.cap);
        this.quality.setLevel(chosen);
        this.phase = 'watching';
      }
      return;
    }

    this.watch[this.watchWrite] = frameMs;
    this.watchWrite = (this.watchWrite + 1) % WATCH_CAP;
    if (this.watchCount < WATCH_CAP) this.watchCount += 1;
    this.watchElapsed += deltaSeconds;

    if (this.watchElapsed >= WATCH_SECONDS) {
      const p95 = percentile95(this.watch, this.watchCount, this.sortBuf);
      const current = this.quality.get().level;
      if (shouldDowngrade(current, p95)) {
        this.quality.setLevel(downgradeQuality(current));
      }
      this.phase = 'done';
    }
  }
}

function levelFromP95(p95: number): QualityLevel {
  if (p95 < P95_HIGH_MS) return 'high';
  if (p95 < P95_MEDIUM_MS) return 'medium';
  return 'low';
}

function shouldDowngrade(level: QualityLevel, p95: number): boolean {
  if (level === 'high') return p95 >= P95_HIGH_MS;
  if (level === 'medium') return p95 >= P95_MEDIUM_MS;
  return false;
}

function percentile95(
  data: Float32Array,
  count: number,
  sortBuf: Float32Array,
): number {
  if (count <= 0) return 0;
  sortBuf.set(data.subarray(0, count));
  const slice = sortBuf.subarray(0, count);
  slice.sort();
  const index = Math.min(count - 1, Math.floor(0.95 * (count - 1)));
  return slice[index] ?? 0;
}
