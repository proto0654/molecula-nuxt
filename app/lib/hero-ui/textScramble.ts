const DEFAULT_CHARSET =
  'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯABCDEFGHIJKLMNOPQRSTUVWXYZ';

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

/** Spaces / punctuation stay put so soft-wrap points do not drift mid-scramble. */
function isStableSlot(ch: string): boolean {
  return !/\p{L}/u.test(ch);
}

/**
 * Left-to-right character resolve with random glyphs until each slot locks.
 * Non-letters stay fixed. Cancel stops rAF and skips onComplete.
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
  const locked = chars.map((ch) => isStableSlot(ch));
  const display = chars.map((ch) => (isStableSlot(ch) ? ch : pick(charset)));
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

/** Letter glyphs from the target so mono wrap stays stable during scramble. */
export function charsetFromTarget(target: string): string {
  const chars = [...new Set([...target].filter((ch) => /\p{L}/u.test(ch)))];
  return chars.length > 0 ? chars.join('') : DEFAULT_CHARSET;
}
