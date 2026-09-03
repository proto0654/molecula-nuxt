import type { MaybeRefOrGetter } from 'vue';
import { toValue } from 'vue';
import { alternateLocalePath, localeFromPath } from '~/domain/i18n';

export type PageSeoOptions = {
  /** Page title without brand suffix (except when `home: true`). */
  title: MaybeRefOrGetter<string | null | undefined>;
  description?: MaybeRefOrGetter<string | null | undefined>;
  ogImage?: MaybeRefOrGetter<string | null | undefined>;
  ogType?: 'website' | 'article';
  /** Home route — `title` is the full document title (no «— WebLaba» suffix). */
  home?: boolean;
  /** Do not emit title/meta until `title` is set (slug pages while loading). */
  deferTitle?: boolean;
};

function joinSiteUrl(siteUrl: string, baseURL: string, path: string): string {
  const origin = siteUrl.replace(/\/$/, '');
  const base = baseURL === '/' ? '' : baseURL.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${base}${normalized}`;
}

function canonicalPath(fullPath: string): string {
  const [path, query = ''] = fullPath.split('?');
  if (!query) return path;
  const params = new URLSearchParams(query);
  const page = params.get('page');
  if (page && page !== '1') return `${path}?page=${page}`;
  return path;
}

export function usePageSeo(options: PageSeoOptions): void {
  const route = useRoute();
  const config = useRuntimeConfig();
  const siteUrl = String(config.public.siteUrl || '').replace(/\/$/, '');
  const baseURL = config.app.baseURL || '/';
  const indexable = config.public.indexable !== false;

  const resolvedTitle = computed(() => {
    const raw = toValue(options.title);
    return raw?.trim() || null;
  });

  const resolvedDescription = computed(() => {
    const raw = toValue(options.description);
    return raw?.trim() || undefined;
  });

  const resolvedOgImage = computed(() => {
    const raw = toValue(options.ogImage);
    return raw?.trim() || undefined;
  });

  const documentTitle = computed(() => {
    if (options.home) return resolvedTitle.value || 'WebLaba';
    const title = resolvedTitle.value;
    if (!title) return options.deferTitle ? undefined : 'WebLaba';
    return `${title} — WebLaba`;
  });

  const canonicalUrl = computed(() => {
    if (!indexable || !siteUrl) return undefined;
    return joinSiteUrl(siteUrl, baseURL, canonicalPath(route.fullPath));
  });

  const ogLocale = computed(() =>
    localeFromPath(route.path) === 'en' ? 'en_US' : 'ru_RU',
  );

  const headLinks = computed(() => {
    if (!indexable || !siteUrl) {
      return canonicalUrl.value
        ? [{ rel: 'canonical', href: canonicalUrl.value }]
        : [];
    }
    const ruHref = joinSiteUrl(
      siteUrl,
      baseURL,
      canonicalPath(alternateLocalePath(route.fullPath, 'ru')),
    );
    const enHref = joinSiteUrl(
      siteUrl,
      baseURL,
      canonicalPath(alternateLocalePath(route.fullPath, 'en')),
    );
    return [
      ...(canonicalUrl.value
        ? [{ rel: 'canonical' as const, href: canonicalUrl.value }]
        : []),
      { rel: 'alternate' as const, hreflang: 'ru', href: ruHref },
      { rel: 'alternate' as const, hreflang: 'en', href: enHref },
      { rel: 'alternate' as const, hreflang: 'x-default', href: ruHref },
    ];
  });

  useSeoMeta({
    title: documentTitle,
    description: resolvedDescription,
    robots: indexable ? undefined : 'noindex, nofollow',
    ogTitle: documentTitle,
    ogDescription: resolvedDescription,
    ogType: options.ogType ?? 'website',
    ogUrl: canonicalUrl,
    ogLocale,
    ogSiteName: 'WebLaba',
    ogImage: resolvedOgImage,
    twitterCard: computed(() =>
      resolvedOgImage.value ? 'summary_large_image' : 'summary',
    ),
    twitterTitle: documentTitle,
    twitterDescription: resolvedDescription,
    twitterImage: resolvedOgImage,
  });

  useHead({
    link: headLinks,
  });
}

/** Absolute URL for Open Graph images from WP media. */
export function absoluteMediaUrl(url: string | null | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  const config = useRuntimeConfig();
  const siteUrl = String(config.public.siteUrl || '').replace(/\/$/, '');
  if (!siteUrl) return url;
  return `${siteUrl}${url.startsWith('/') ? url : `/${url}`}`;
}
