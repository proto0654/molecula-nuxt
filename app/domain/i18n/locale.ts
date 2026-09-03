export type SiteLocale = 'ru' | 'en';

export const DEFAULT_LOCALE: SiteLocale = 'ru';

export const EN_PREFIX = '/en';

export function normalizePath(path: string): string {
  if (!path || path === '/') return '/';
  const trimmed = path.replace(/\/+$/, '');
  return trimmed || '/';
}

/** Strip `/en` prefix for spatial / archive path matching. */
export function stripLocalePrefix(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === EN_PREFIX) return '/';
  if (normalized.startsWith(`${EN_PREFIX}/`)) {
    return normalizePath(normalized.slice(EN_PREFIX.length));
  }
  return normalized;
}

export function localeFromPath(path: string): SiteLocale {
  const normalized = normalizePath(path);
  return normalized === EN_PREFIX || normalized.startsWith(`${EN_PREFIX}/`)
    ? 'en'
    : 'ru';
}

/** Locale-neutral path → path with optional `/en` prefix. */
export function localizedPath(path: string, locale: SiteLocale = DEFAULT_LOCALE): string {
  const stripped = stripLocalePrefix(path);
  if (locale === 'ru') return stripped;
  if (stripped === '/') return `${EN_PREFIX}/`;
  return `${EN_PREFIX}${stripped}`;
}

/** Swap locale on a route path (keeps query string if passed in fullPath). */
export function alternateLocalePath(
  fullPath: string,
  target: SiteLocale,
): string {
  const [pathPart, query = ''] = fullPath.split('?');
  const stripped = stripLocalePrefix(pathPart);
  const next = localizedPath(stripped, target);
  return query ? `${next}?${query}` : next;
}
