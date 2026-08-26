import type { Case, CaseImage } from '~/types/wp';

export type CaseHeroKind = 'video' | 'landing' | 'featured';
export type CaseHeroLayout = 'split' | 'stack' | 'text';

const LANDING_SIZES = ['weblaba-landing', 'weblaba-screen', 'medium_large', 'large'] as const;
const SCREEN_SIZES = ['weblaba-screen', 'weblaba-landing', 'medium_large', 'large'] as const;

/** Hero source: video → landing_screen → featured. screenshot_image is not a hero. */
export function getCaseHeroKind(c: Case): CaseHeroKind | null {
  if (c.video) return 'video';
  if (c.landingScreen) return 'landing';
  if (c.featuredImage) return 'featured';
  return null;
}

export function getCaseHeroLayout(kind: CaseHeroKind | null): CaseHeroLayout {
  if (kind === 'video' || kind === 'landing') return 'split';
  if (kind === 'featured') return 'stack';
  return 'text';
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
  if (kind === 'featured' && c.featuredImage) {
    return caseImageUrl(c.featuredImage, SCREEN_SIZES);
  }
  return null;
}

export function caseHeroAlt(c: Case, kind: CaseHeroKind): string {
  if (kind === 'landing') {
    return c.landingScreen?.alt || stripTags(c.title);
  }
  if (kind === 'featured') {
    return c.featuredImage?.alt || stripTags(c.title);
  }
  return stripTags(c.title);
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
  const gallery = c.gallery.length ? n++ : 0;
  const mobile = c.mobile ? n++ : 0;
  const slices = c.mobileSlices ? n++ : 0;
  return { content, gallery, mobile, slices };
}

export function padCaseIndex(index: number): string {
  return String(index).padStart(2, '0');
}
