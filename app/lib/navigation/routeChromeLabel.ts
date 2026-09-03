import { stripLocalePrefix } from '~/domain/i18n';

export type ArchiveScope = 'portfolio' | 'services';

/**
 * Route path → top-right chrome label for archive/section pages.
 * Returns null for home and slug detail routes (CASE/SERVICE branch).
 */
export function routeChromeLabel(
  path: string,
  archiveScope: ArchiveScope = 'portfolio',
): string | null {
  const segments = stripLocalePrefix(path).split('/').filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const [head, entityId] = segments;

  if (head === 'portfolio') {
    // `/portfolio` and `/portfolio/legacy` are archives; other segments are cases.
    if (!entityId || entityId === 'legacy') {
      return 'ARCHIVE / portfolio';
    }
    return null;
  }

  if (head === 'services') {
    if (entityId) {
      return null;
    }
    return 'ARCHIVE / services';
  }

  if (segments.length === 1) {
    return head;
  }

  return `ARCHIVE / ${archiveScope}`;
}
