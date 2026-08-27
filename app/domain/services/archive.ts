import type { CaseImage, Service } from '~/types/wp';
import { caseImageUrl, CASE_SCREEN_SIZES, stripTags } from '~/domain/portfolio/presentation';

export type ServiceArchiveEntry = {
  item: Service;
  /** 1-based index in slim production order (same as SERVICE / NN). */
  index: number;
};

export function serviceArchiveTitlePlain(item: Service): string {
  return stripTags(item.title) || item.slug;
}

export function serviceArchiveSpecimenImage(item: Service): CaseImage | null {
  return item.featuredImage;
}

export function serviceArchiveSpecimenUrl(item: Service): string | null {
  const image = serviceArchiveSpecimenImage(item);
  if (!image) return null;
  return caseImageUrl(image, CASE_SCREEN_SIZES);
}

/**
 * Tag names, else chrome fallback "Услуга".
 * Never invent a fake CMS category.
 */
export function serviceArchiveMetaLabel(item: Service): string {
  if (item.tags.length) return item.tags.join(', ');
  return 'Услуга';
}
