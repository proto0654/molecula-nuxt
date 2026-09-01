function normalizePath(path: string): string {
  if (!path || path === '/') return '/';
  const trimmed = path.replace(/\/+$/, '');
  return trimmed || '/';
}

export type ArchiveScope = 'portfolio' | 'services';

/**
 * Route path → top-right chrome label for archive/section pages.
 * Returns null for home and slug detail routes (CASE/SERVICE branch).
 */
export function routeChromeLabel(
  path: string,
  archiveScope: ArchiveScope = 'portfolio',
): string | null {
  const segments = normalizePath(path).split('/').filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const [head, entityId] = segments;

  if (head === 'portfolio' || head === 'services') {
    if (entityId) {
      return null;
    }
    return `ARCHIVE / ${head}`;
  }

  if (segments.length === 1) {
    return head;
  }

  return `ARCHIVE / ${archiveScope}`;
}
