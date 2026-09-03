import type { WpLocalizedMeta, WpPortfolioCategory, WpPortfolioPost } from '~/types/wp';
import { resolveEnTitle } from '~/domain/i18n';
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
  /** Plain RU title for prev/next labels. */
  title: string;
  /** EN title from WP meta when present. */
  titleEn: string | null;
  /** WP `portfolio_category` term ids (legacy shelf = includes legacy term). */
  categoryIds: number[];
};

type SlimIndexRaw = {
  id: number;
  slug: string;
  menu_order: number;
  date: string;
  title?: { rendered?: string };
  portfolio_category?: number[];
  meta?: WpLocalizedMeta;
};

const SLIM_FIELDS = [
  'id',
  'slug',
  'menu_order',
  'date',
  'title',
  'portfolio_category',
  'meta',
].join(',');

function mapSlimItem(raw: SlimIndexRaw): PortfolioSlimItem {
  const rendered = raw.title?.rendered ?? '';
  const title = rendered.replace(/<[^>]*>/g, '').trim() || raw.slug;
  return {
    id: raw.id,
    slug: raw.slug,
    menu_order: raw.menu_order,
    date: raw.date,
    title,
    titleEn: resolveEnTitle(raw.meta, undefined),
    categoryIds: Array.isArray(raw.portfolio_category)
      ? raw.portfolio_category
      : [],
  };
}

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

/**
 * Fetch specific posts in `ids` order (slim-index pagination).
 * Client-side reorder is the source of truth if WP ignores `orderby=include`.
 */
export async function getPortfolioPostsByIds(
  ids: number[],
): Promise<WpPortfolioPost[]> {
  if (!ids.length) return [];
  const query = {
    include: ids.join(','),
    per_page: ids.length,
    status: 'publish',
    _embed: 'wp:featuredmedia',
  };
  let posts: WpPortfolioPost[];
  try {
    posts = await wpFetch<WpPortfolioPost[]>('/wp/v2/portfolio', {
      query: { ...query, orderby: 'include' },
    });
  } catch {
    posts = await wpFetch<WpPortfolioPost[]>('/wp/v2/portfolio', { query });
  }
  const byId = new Map(posts.map((post) => [post.id, post]));
  const ordered: WpPortfolioPost[] = [];
  for (const id of ids) {
    const post = byId.get(id);
    if (post) ordered.push(post);
  }
  return ordered;
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
  const base = typeof baseOverride === 'string' ? baseOverride : getWpApiBaseFromEnv();

  while (page <= totalPages) {
    const result = await wpFetchPaginated<SlimIndexRaw[]>(
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
    for (const raw of result.data) {
      items.push(mapSlimItem(raw));
    }
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
