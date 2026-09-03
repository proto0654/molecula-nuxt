import type { Case, CaseImage, PortfolioCategory } from '~/types/wp';
import type { SiteLocale } from '~/domain/i18n';
import {
  caseImageSrcSet,
  caseImageUrl,
  CASE_SCREEN_SIZES,
  stripTags,
} from './presentation';

export type ArchiveEntry = {
  item: Case;
  /** 1-based index in slim production order (same as CASE / NN). */
  index: number;
};

export function archiveTitlePlain(item: Case): string {
  return stripTags(item.title) || item.slug;
}

export function archiveSpecimenImage(item: Case): CaseImage | null {
  return item.featuredImage ?? item.landingScreen;
}

export function archiveSpecimenUrl(item: Case): string | null {
  const image = archiveSpecimenImage(item);
  if (!image) return null;
  return caseImageUrl(image, CASE_SCREEN_SIZES);
}

export function archiveSpecimenSrcSet(item: Case): string | null {
  const image = archiveSpecimenImage(item);
  if (!image) return null;
  return caseImageSrcSet(image, CASE_SCREEN_SIZES);
}

export function archiveYear(date: string): string | null {
  const ms = Date.parse(date);
  if (!Number.isFinite(ms)) return null;
  return String(new Date(ms).getUTCFullYear());
}

/**
 * Category label for archive meta.
 * RU: CMS term name. EN: latin slug when present (terms have no name_en).
 */
function categoryMetaLabel(
  cat: { name: string; slug?: string },
  locale: SiteLocale,
): string {
  if (locale === 'en') {
    const slug = cat.slug?.trim();
    if (slug) return slug;
  }
  return cat.name;
}

/**
 * Category names, else shelf caption, else client, else year, else "Project".
 * Never invent a fake CMS category.
 */
export function archiveMetaLabel(
  item: Case,
  categoryById: Map<number, string>,
  shelfLabel?: string | null,
): string {
  const names: string[] = [];
  for (const id of item.categoryIds) {
    const name = categoryById.get(id);
    if (name) names.push(name);
  }
  if (names.length) return names.join(', ');
  const shelf = shelfLabel?.trim();
  if (shelf) return shelf;
  if (item.client) return item.client;
  return archiveYear(item.date) ?? 'Project';
}

export function categoryNameMap(
  categories: PortfolioCategory[] | null | undefined,
  locale: SiteLocale = 'ru',
): Map<number, string> {
  const map = new Map<number, string>();
  for (const cat of categories ?? []) {
    map.set(cat.id, categoryMetaLabel(cat, locale));
  }
  return map;
}
