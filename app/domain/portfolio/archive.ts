import type { Case, CaseImage, PortfolioCategory } from '~/types/wp';
import { caseImageUrl, CASE_SCREEN_SIZES, stripTags } from './presentation';

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

export function archiveYear(date: string): string | null {
  const ms = Date.parse(date);
  if (!Number.isFinite(ms)) return null;
  return String(new Date(ms).getUTCFullYear());
}

/**
 * Category names, else client, else year, else "Project".
 * Never invent a fake CMS category.
 */
export function archiveMetaLabel(
  item: Case,
  categoryById: Map<number, string>,
): string {
  const names: string[] = [];
  for (const id of item.categoryIds) {
    const name = categoryById.get(id);
    if (name) names.push(name);
  }
  if (names.length) return names.join(', ');
  if (item.client) return item.client;
  return archiveYear(item.date) ?? 'Project';
}

export function categoryNameMap(
  categories: PortfolioCategory[] | null | undefined,
): Map<number, string> {
  const map = new Map<number, string>();
  for (const cat of categories ?? []) {
    map.set(cat.id, cat.name);
  }
  return map;
}
