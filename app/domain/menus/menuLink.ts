import type { NavigationMenuItem } from '~/types/wp';

const WP_HOSTS = new Set(['weblaba.ru', 'www.weblaba.ru', 'api.weblaba.ru']);

/**
 * Map a raw href to an in-app path when it points at this site.
 * Returns null for external / protocol / hash-only links (leave to the browser).
 */
export function internalAppPathFromHref(rawHref: string): string | null {
  const raw = rawHref.trim();
  if (!raw) return null;

  if (
    raw.startsWith('mailto:') ||
    raw.startsWith('tel:') ||
    raw.startsWith('#')
  ) {
    return null;
  }

  if (raw.startsWith('/')) {
    return normalizeAppPath(raw);
  }

  try {
    const base =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://weblaba.ru';
    const parsed = new URL(raw, base);
    const sameHost =
      typeof window !== 'undefined' &&
      parsed.hostname === window.location.hostname;
    if (WP_HOSTS.has(parsed.hostname) || sameHost) {
      return normalizeAppPath(
        `${parsed.pathname}${parsed.search}${parsed.hash}`,
      );
    }
    return null;
  } catch {
    return null;
  }
}

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

  return internalAppPathFromHref(raw) ?? raw;
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
