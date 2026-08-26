import type { Case, CaseImage, CaseMobileSlices } from '~/types/wp';

export type CaseHeroKind = 'video' | 'landing';
export type CaseHeroLayout = 'split' | 'text';

const LANDING_SIZES = ['weblaba-landing', 'weblaba-screen', 'medium_large', 'large'] as const;
const SCREEN_SIZES = ['weblaba-screen', 'weblaba-landing', 'medium_large', 'large'] as const;

export const CASE_LANDING_SIZES = LANDING_SIZES;
export const CASE_SCREEN_SIZES = SCREEN_SIZES;

/**
 * Hero media: video only.
 * `landing_screen` lives in Screens (index 0 with repeater) — not duplicated in hero.
 */
export function getCaseHeroKind(c: Case): CaseHeroKind | null {
  if (c.video) return 'video';
  return null;
}

export function getCaseHeroLayout(kind: CaseHeroKind | null): CaseHeroLayout {
  if (kind === 'video') return 'split';
  return 'text';
}

export type CaseScreenItem = {
  image: CaseImage;
  /** From landing_screen (grid index 0) vs repeater. */
  source: 'landing' | 'repeater';
};

/** Screens = landing_screen (optional, index 0) + repeater fields. */
export function getCaseScreenItems(c: Case): CaseScreenItem[] {
  const items: CaseScreenItem[] = [];
  if (c.landingScreen) {
    items.push({ image: c.landingScreen, source: 'landing' });
  }
  for (const row of c.gallery) {
    items.push({ image: row.image, source: 'repeater' });
  }
  return items;
}

/** Only landing_screen, no repeater → single full-width card. */
export function isCaseScreensLandingOnly(c: Case): boolean {
  return Boolean(c.landingScreen && c.gallery.length === 0);
}

/** Placed screen with original flat index (lightbox / labels). */
export type CaseScreenColumnItem = {
  item: CaseScreenItem;
  index: number;
};

/**
 * Relative height ≈ column widths (image aspect h/w).
 * Stair / gap mid-estimates match CSS clamps vs ~column width.
 */
const SCREEN_COLUMN_GAP = 0.35;
const SCREEN_COLUMN_STAIR = [1.4, 0.7, 0] as const;
/** Exhaustive column assign for remaining items; above this → greedy + local. */
const SCREEN_COLUMN_EXHAUSTIVE_MAX = 12;

type ScreenPackScore = [number, number, number, number, number];

function screenRelativeHeight(item: CaseScreenItem): number {
  const w = item.image.width;
  const h = item.image.height;
  if (w && h && w > 0 && h > 0) return h / w;
  return 1;
}

function screenColumnHeight(
  colItems: CaseScreenColumnItem[],
  col: number,
): number {
  if (colItems.length === 0) return 0;
  let h =
    (SCREEN_COLUMN_STAIR[col] ?? 0) + screenRelativeHeight(colItems[0]!.item);
  for (let i = 1; i < colItems.length; i += 1) {
    h += SCREEN_COLUMN_GAP + screenRelativeHeight(colItems[i]!.item);
  }
  return h;
}

/**
 * Always keep `columnCount` tracks (no collapse).
 * Lexicographic: holes → underfilled tracks → descending L→R → spread → peak.
 * Taller stacks prefer earlier columns (e.g. 01|03|02 over 01|02|03).
 */
function screenPackScore(
  cols: CaseScreenColumnItem[][],
  itemCount: number,
  columnCount: number,
): ScreenPackScore {
  let holePenalty = 0;
  let seenEmpty = false;
  for (const colItems of cols) {
    if (colItems.length === 0) seenEmpty = true;
    else if (seenEmpty) holePenalty += 1;
  }

  const heights = cols.map((colItems, col) =>
    screenColumnHeight(colItems, col),
  );
  const used = cols.reduce(
    (n, colItems) => n + (colItems.length > 0 ? 1 : 0),
    0,
  );
  const targetCols = Math.min(columnCount, itemCount);
  const tooFew = used < targetCols ? 1 : 0;

  // Leading tracks only (trailing empties ignored for desc / spread).
  const active = heights.slice(0, Math.max(used, 1));

  let max = 0;
  let min = 0;
  let spread = 0;
  if (used > 0) {
    max = -Infinity;
    min = Infinity;
    for (let c = 0; c < cols.length; c += 1) {
      if (cols[c]!.length === 0) continue;
      const v = heights[c]!;
      if (v > max) max = v;
      if (v < min) min = v;
    }
    spread = max - min;
  }

  let descPenalty = 0;
  for (let i = 0; i < active.length - 1; i += 1) {
    if (active[i]! < active[i + 1]!) {
      descPenalty += active[i + 1]! - active[i]!;
    }
  }

  return [holePenalty, tooFew, descPenalty, spread, max];
}

function screenPackScoreBetter(a: ScreenPackScore, b: ScreenPackScore): boolean {
  for (let i = 0; i < 5; i += 1) {
    if (a[i]! < b[i]!) return true;
    if (a[i]! > b[i]!) return false;
  }
  return false;
}

function buildScreenColumns(
  pinned: CaseScreenColumnItem,
  rest: CaseScreenColumnItem[],
  assign: number[],
  columnCount: number,
): CaseScreenColumnItem[][] {
  const cols: CaseScreenColumnItem[][] = Array.from(
    { length: columnCount },
    () => [],
  );
  cols[0]!.push(pinned);
  for (let i = 0; i < rest.length; i += 1) {
    const col = assign[i] ?? 0;
    cols[col]!.push(rest[i]!);
  }
  return cols;
}

function packScreenColumnsExhaustive(
  pinned: CaseScreenColumnItem,
  rest: CaseScreenColumnItem[],
  columnCount: number,
  itemCount: number,
): CaseScreenColumnItem[][] {
  const n = rest.length;
  if (n === 0) {
    return Array.from({ length: columnCount }, (_, i) =>
      i === 0 ? [pinned] : [],
    );
  }

  const assign = Array.from({ length: n }, () => 0);
  let bestCols = buildScreenColumns(pinned, rest, assign, columnCount);
  let bestScore = screenPackScore(bestCols, itemCount, columnCount);

  const total = columnCount ** n;
  for (let code = 1; code < total; code += 1) {
    let x = code;
    for (let i = 0; i < n; i += 1) {
      assign[i] = x % columnCount;
      x = (x / columnCount) | 0;
    }
    const cols = buildScreenColumns(pinned, rest, assign, columnCount);
    const score = screenPackScore(cols, itemCount, columnCount);
    if (screenPackScoreBetter(score, bestScore)) {
      bestScore = score;
      bestCols = cols;
    }
  }
  return bestCols;
}

function packScreenColumnsGreedy(
  pinned: CaseScreenColumnItem,
  rest: CaseScreenColumnItem[],
  columnCount: number,
  itemCount: number,
): CaseScreenColumnItem[][] {
  const cols: CaseScreenColumnItem[][] = Array.from(
    { length: columnCount },
    () => [],
  );
  cols[0]!.push(pinned);

  const ordered = rest
    .map((placed) => ({
      placed,
      h: screenRelativeHeight(placed.item),
    }))
    .sort((a, b) => b.h - a.h || a.placed.index - b.placed.index);

  for (const { placed } of ordered) {
    let bestCol = 0;
    let bestScore: ScreenPackScore | null = null;
    for (let c = 0; c < columnCount; c += 1) {
      cols[c]!.push(placed);
      const score = screenPackScore(cols, itemCount, columnCount);
      if (bestScore === null || screenPackScoreBetter(score, bestScore)) {
        bestScore = score;
        bestCol = c;
      }
      cols[c]!.pop();
    }
    cols[bestCol]!.push(placed);
  }

  let improved = true;
  while (improved) {
    improved = false;
    const baseScore = screenPackScore(cols, itemCount, columnCount);
    outer: for (let from = 0; from < columnCount; from += 1) {
      const startRow = from === 0 ? 1 : 0;
      for (let row = startRow; row < cols[from]!.length; row += 1) {
        const placed = cols[from]![row]!;
        for (let to = 0; to < columnCount; to += 1) {
          if (to === from) continue;
          cols[from]!.splice(row, 1);
          cols[to]!.push(placed);
          if (
            screenPackScoreBetter(
              screenPackScore(cols, itemCount, columnCount),
              baseScore,
            )
          ) {
            improved = true;
            break outer;
          }
          cols[to]!.pop();
          cols[from]!.splice(row, 0, placed);
        }
      }
    }
  }

  return cols;
}

/**
 * Desktop Screens pack (≥1024): always `columnCount` flex tracks (default 3).
 * - items[0] stays first in column 0 (more items may follow in that column)
 * - from 2+ screens keep 3 columns (no collapse to 2)
 * - taller stacks prefer earlier columns (descending), then equalize spread
 */
export function balanceCaseScreenColumns(
  items: CaseScreenItem[],
  columnCount = 3,
): CaseScreenColumnItem[][] {
  if (items.length === 0) {
    return Array.from({ length: columnCount }, () => []);
  }

  const itemCount = items.length;
  const pinned: CaseScreenColumnItem = { item: items[0]!, index: 0 };
  const rest: CaseScreenColumnItem[] = items
    .slice(1)
    .map((item, i) => ({ item, index: i + 1 }));

  // Stable order within each column (original flat index).
  rest.sort((a, b) => a.index - b.index);

  return rest.length <= SCREEN_COLUMN_EXHAUSTIVE_MAX
    ? packScreenColumnsExhaustive(pinned, rest, columnCount, itemCount)
    : packScreenColumnsGreedy(pinned, rest, columnCount, itemCount);
}

export function caseImageUrl(
  image: CaseImage,
  preferred: readonly string[] = SCREEN_SIZES,
): string {
  for (const key of preferred) {
    const url = image.sizes[key];
    if (url) return url;
  }
  return image.url;
}

export function caseHeroImageUrl(c: Case, kind: CaseHeroKind): string | null {
  if (kind === 'landing' && c.landingScreen) {
    return caseImageUrl(c.landingScreen, LANDING_SIZES);
  }
  return null;
}

export function caseHeroAlt(c: Case, kind: CaseHeroKind): string {
  if (kind === 'landing') {
    return c.landingScreen?.alt || stripTags(c.title);
  }
  return stripTags(c.title);
}

/** Featured image URL for fixed page backdrop (under chrome grid). */
export function caseFeaturedBackdropUrl(c: Case): string | null {
  if (!c.featuredImage) return null;
  return caseImageUrl(c.featuredImage, SCREEN_SIZES);
}

export function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sequential numbers for visible blocks only (absent blocks do not leave gaps).
 * 0 means the block is not present.
 */
export function getCaseSectionNumbers(c: Case): {
  content: number;
  gallery: number;
  mobile: number;
  slices: number;
} {
  let n = 1;
  const content = c.contentHtml ? n++ : 0;
  const gallery = getCaseScreenItems(c).length ? n++ : 0;
  const mobile = c.mobile ? n++ : 0;
  const slices = c.mobileSlices ? n++ : 0;
  return { content, gallery, mobile, slices };
}

export function padCaseIndex(index: number): string {
  return String(index).padStart(2, '0');
}

export type BlockRatio = {
  w: number;
  h: number;
};

/** Parse ACF `block_ratio` strings like `1/2.3`, `3/4`. */
export function parseBlockRatio(raw: string): BlockRatio | null {
  const parts = raw.trim().split('/');
  if (parts.length !== 2) return null;
  const w = Number.parseFloat(parts[0] ?? '');
  const h = Number.parseFloat(parts[1] ?? '');
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return { w, h };
}

export type CaseSliceCell = {
  index: number;
  label: string;
  bgY: number;
  colOddDesktop: boolean;
  colOddMobile: boolean;
};

export type CaseSliceLayout = {
  total: number;
  columns: number;
  rows: number;
  rowsMobile: number;
  aspectRatioCss: string;
  cells: CaseSliceCell[];
};

/**
 * Port of weblaba_rework_screen_slice_bg_position_y_percent.
 * One image, N windows via background-position-y.
 */
export function sliceBgYPercent(
  index: number,
  total: number,
  boxRatio: number,
  imageRatio: number,
): number {
  if (total <= 1 || imageRatio <= 0) return 0;
  const visibleSpan = boxRatio / imageRatio;
  const denominator = 1 - visibleSpan;
  if (denominator <= 0) return 0;
  const maxStart = Math.max(0, 1 - visibleSpan);
  const start =
    index >= total - 1
      ? maxStart
      : Math.min(Math.max((index * boxRatio) / imageRatio, 0), maxStart);
  return (start / denominator) * 100;
}

export function getCaseSliceLayout(slices: CaseMobileSlices): CaseSliceLayout | null {
  const parsed = parseBlockRatio(slices.ratio);
  const width = slices.image.width;
  const height = slices.image.height;
  if (!parsed || width == null || height == null || width <= 0 || height <= 0) {
    return null;
  }

  const boxRatio = parsed.h / parsed.w;
  const imageRatio = height / width;
  const total = Math.max(1, Math.ceil(imageRatio / boxRatio));

  let columns = Math.min(total, 6);
  if (columns % 2 === 1) columns -= 1;
  columns = Math.max(2, columns);

  const rows = Math.ceil(total / columns);
  const rowsMobile = Math.ceil(total / 2);
  const aspectRatioCss = `${parsed.w} / ${parsed.h}`;

  const cells: CaseSliceCell[] = [];
  for (let index = 0; index < total; index += 1) {
    const colDesktop = Math.floor(index / rows);
    const colMobile = Math.floor(index / rowsMobile);
    cells.push({
      index,
      label: padCaseIndex(index + 1),
      bgY: sliceBgYPercent(index, total, boxRatio, imageRatio),
      colOddDesktop: colDesktop % 2 === 1,
      colOddMobile: colMobile % 2 === 1,
    });
  }

  return {
    total,
    columns,
    rows,
    rowsMobile,
    aspectRatioCss,
    cells,
  };
}
