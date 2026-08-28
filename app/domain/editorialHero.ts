import type { Case, CaseImage, CaseVideo } from '~/types/wp';
import {
  caseImageUrl,
  CASE_LANDING_SIZES,
  CASE_SCREEN_SIZES,
  stripTags,
} from '~/domain/portfolio/presentation';

export type EditorialHeroMedia =
  | { kind: 'video'; video: CaseVideo }
  | { kind: 'image'; image: CaseImage; alt: string }
  | { kind: 'placeholder' };

/** Default frame ratio — images use this; video uses native dimensions when known. */
export const EDITORIAL_HERO_MEDIA_RATIO = '16 / 9';

/** About portrait — always square on all breakpoints. */
export const EDITORIAL_HERO_MEDIA_RATIO_ABOUT = '1 / 1';

export type EditorialHeroVariant = 'archive' | 'case' | 'about';

export function editorialHeroFrameAspectRatio(
  media: EditorialHeroMedia,
  variant: EditorialHeroVariant = 'archive',
): string {
  if (variant === 'about') return EDITORIAL_HERO_MEDIA_RATIO_ABOUT;
  if (
    media.kind === 'video' &&
    media.video.width &&
    media.video.height &&
    media.video.width > 0 &&
    media.video.height > 0
  ) {
    return `${media.video.width} / ${media.video.height}`;
  }
  return EDITORIAL_HERO_MEDIA_RATIO;
}

export function resolveCaseHeroMedia(c: Case): EditorialHeroMedia {
  if (c.video) return { kind: 'video', video: c.video };
  if (c.featuredImage) {
    return {
      kind: 'image',
      image: c.featuredImage,
      alt: stripTags(c.title) || c.slug,
    };
  }
  return { kind: 'placeholder' };
}

export function resolveAboutHeroMedia(
  photo: CaseImage | null,
  alt: string,
): EditorialHeroMedia {
  if (photo) return { kind: 'image', image: photo, alt };
  return { kind: 'placeholder' };
}

export function resolveServiceHeroMedia(
  _image: CaseImage | null,
  _alt: string,
): EditorialHeroMedia {
  return { kind: 'placeholder' };
}

export function contactHeroMedia(): EditorialHeroMedia {
  return { kind: 'placeholder' };
}

export function editorialHeroImageSrc(
  image: CaseImage,
  sizes: readonly string[] = CASE_SCREEN_SIZES,
): string {
  return caseImageUrl(image, sizes);
}

export function editorialHeroAboutImageSrc(image: CaseImage): string {
  return caseImageUrl(image, CASE_LANDING_SIZES);
}
