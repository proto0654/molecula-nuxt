import type { WpPortfolioCategory, WpPortfolioPost } from '~/types/wp';
import {
  getWpApiBaseFromEnv,
  wpFetch,
  wpFetchPaginated,
  type WpPaginatedResult,
} from './client';

export type PortfolioListParams = {
  page?: number;
  perPage?: number;
  /** Include featured media embed when true (default true). */
  embed?: boolean;
};

/** Minimal fields for adjacent-case ordering (menu_order ASC, date DESC). */
export type PortfolioSlimItem = {
  id: number;
  slug: string;
  menu_order: number;
  date: string;
};

const SLIM_FIELDS = ['id', 'slug', 'menu_order', 'date'].join(',');

export async function getPortfolioPage(
  params: PortfolioListParams = {},
): Promise<WpPaginatedResult<WpPortfolioPost[]>> {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 12;
  const embed = params.embed !== false;

  return wpFetchPaginated<WpPortfolioPost[]>('/wp/v2/portfolio', {
    query: {
      page,
      per_page: perPage,
      status: 'publish',
      ...(embed ? { _embed: 'wp:featuredmedia' } : {}),
    },
  });
}

export async function getPortfolioCase(slug: string): Promise<WpPortfolioPost | null> {
  const posts = await wpFetch<WpPortfolioPost[]>('/wp/v2/portfolio', {
    query: {
      slug,
      per_page: 1,
      status: 'publish',
      _embed: 'wp:featuredmedia',
    },
  });
  return posts[0] ?? null;
}

export async function getPortfolioCategories(): Promise<WpPortfolioCategory[]> {
  return wpFetch<WpPortfolioCategory[]>('/wp/v2/portfolio_category', {
    query: { per_page: 100 },
  });
}

/**
 * Full slim index for prev/next. Paginates through WP until all posts collected.
 * Pass `baseOverride` for build-time (nuxt.config) without Nuxt context.
 */
export async function getPortfolioSlimIndex(
  baseOverride?: string,
): Promise<PortfolioSlimItem[]> {
  const perPage = 100;
  let page = 1;
  let totalPages = 1;
  const items: PortfolioSlimItem[] = [];
  const base = baseOverride ?? getWpApiBaseFromEnv();

  while (page <= totalPages) {
    const result = await wpFetchPaginated<PortfolioSlimItem[]>(
      '/wp/v2/portfolio',
      {
        query: {
          page,
          per_page: perPage,
          status: 'publish',
          _fields: SLIM_FIELDS,
        },
      },
      base,
    );
    items.push(...result.data);
    totalPages = Math.max(1, result.pagination.totalPages);
    page += 1;
  }

  return items;
}

/** All publish slugs (for nitro prerender). */
export async function getPortfolioSlugs(baseOverride?: string): Promise<string[]> {
  const index = await getPortfolioSlimIndex(baseOverride ?? getWpApiBaseFromEnv());
  return index.map((item) => item.slug).filter(Boolean);
}
