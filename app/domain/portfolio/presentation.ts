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

