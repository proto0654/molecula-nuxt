import type { NavigationMenuItem } from '~/types/wp';

const WP_HOSTS = new Set(['weblaba.ru', 'www.weblaba.ru', 'api.weblaba.ru']);

/**
 * Map WP menu URLs to in-app paths when they point at this site.
 * External / protocol / mailto / tel links stay absolute.
 */
export function menuItemHref(item: NavigationMenuItem): string {
  const raw = item.url?.trim();
  if (!raw) return '#';

  if (
    raw.startsWith('mailto:') ||
    raw.startsWith('tel:') ||
    raw.startsWith('#')
  ) {
    return raw;
  }

  if (raw.startsWith('/')) {
    return normalizeAppPath(raw);
  }

  try {
    const parsed = new URL(raw);
    if (WP_HOSTS.has(parsed.hostname)) {
      return normalizeAppPath(`${parsed.pathname}${parsed.search}${parsed.hash}`);
    }
    return raw;
  } catch {
    return raw;
  }
}

export function menuItemIsExternal(item: NavigationMenuItem): boolean {
  const href = menuItemHref(item);
  return (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  );
}

function normalizeAppPath(path: string): string {
  if (!path || path === '/') return '/';
  const cleaned = path.replace(/\/+$/, '') || '/';
  // Legacy WP query pages are not Nuxt routes — keep as-is only if path-like.
  if (cleaned.includes('page_id=')) return path;
  return cleaned;
}
