const DEFAULT_CHARSET =
  'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюяABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/·⟨⟩';

export type ScrambleHandle = {
  cancel: () => void;
};

export type ScrambleOptions = {
  /** Total scramble duration in seconds. Default ~0.55. */
  duration?: number;
  charset?: string;
  reducedMotion?: boolean;
  onFrame: (display: string) => void;
  onComplete?: () => void;
};

/**
 * Left-to-right character resolve with random glyphs until each slot locks.
 * Spaces stay spaces. Cancel stops rAF and skips onComplete.
 */
export function scrambleText(target: string, options: ScrambleOptions): ScrambleHandle {
  const {
    duration = 0.55,
    charset = DEFAULT_CHARSET,
    reducedMotion = false,
    onFrame,
    onComplete,
  } = options;

  if (reducedMotion || duration <= 0 || target.length === 0) {
    onFrame(target);
    onComplete?.();
    return { cancel: () => {} };
  }

  const chars = [...target];
  const locked = chars.map((ch) => ch === ' ');
  const display = chars.map((ch) => (ch === ' ' ? ' ' : pick(charset)));
  const charsetLen = charset.length;
  let cancelled = false;
  let start: number | null = null;
  let raf = 0;

  const tick = (now: number): void => {
    if (cancelled) return;
    if (start === null) start = now;
    const t = Math.min(1, (now - start) / (duration * 1000));

    for (let i = 0; i < chars.length; i++) {
      if (locked[i]) continue;
      const unlockAt = (i + 1) / chars.length;
      if (t >= unlockAt) {
        locked[i] = true;
        display[i] = chars[i]!;
      } else {
        display[i] = charset[(Math.random() * charsetLen) | 0]!;
      }
    }

    onFrame(display.join(''));

    if (t >= 1) {
      onFrame(target);
      onComplete?.();
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);

  return {
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    },
  };
}

function pick(charset: string): string {
  return charset[(Math.random() * charset.length) | 0]!;
}

/** Scramble with glyphs from the target so line breaks stay stable in mono. */
export function charsetFromTarget(target: string): string {
  const chars = [...new Set(target.replace(/\s+/g, ''))];
  return chars.length > 0 ? chars.join('') : target;
}
