import type { WpLocalizedMeta, WpServicePost } from '~/types/wp';
import { resolveEnTitle } from '~/domain/i18n';
import {
  getWpApiBaseFromEnv,
  wpFetch,
  wpFetchPaginated,
} from './client';

const SERVICE_EMBED = 'wp:featuredmedia,wp:term';

/** Minimal fields for adjacent-service ordering (menu_order ASC, date ASC). */
export type ServiceSlimItem = {
  id: number;
  slug: string;
  menu_order: number;
  date: string;
  title: string;
  titleEn: string | null;
};

type SlimIndexRaw = {
  id: number;
  slug: string;
  menu_order: number;
  date: string;
  title?: { rendered?: string };
  meta?: WpLocalizedMeta;
};

const SLIM_FIELDS = ['id', 'slug', 'menu_order', 'date', 'title', 'meta'].join(',');

function mapSlimItem(raw: SlimIndexRaw): ServiceSlimItem {
  const rendered = raw.title?.rendered ?? '';
  const title = rendered.replace(/<[^>]*>/g, '').trim() || raw.slug;
  return {
    id: raw.id,
    slug: raw.slug,
    menu_order: raw.menu_order,
    date: raw.date,
    title,
    titleEn: resolveEnTitle(raw.meta, undefined),
  };
}

/**
 * Fetch specific posts in `ids` order (slim-index pagination).
 * Client-side reorder is the source of truth if WP ignores `orderby=include`.
 */
export async function getServicePostsByIds(ids: number[]): Promise<WpServicePost[]> {
  if (!ids.length) return [];
  const query = {
    include: ids.join(','),
    per_page: ids.length,
    status: 'publish',
    _embed: SERVICE_EMBED,
  };
  let posts: WpServicePost[];
  try {
    posts = await wpFetch<WpServicePost[]>('/wp/v2/services', {
      query: { ...query, orderby: 'include' },
    });
  } catch {
    posts = await wpFetch<WpServicePost[]>('/wp/v2/services', { query });
  }
  const byId = new Map(posts.map((post) => [post.id, post]));
  const ordered: WpServicePost[] = [];
  for (const id of ids) {
    const post = byId.get(id);
    if (post) ordered.push(post);
  }
  return ordered;
}

export async function getServiceBySlug(slug: string): Promise<WpServicePost | null> {
  const posts = await wpFetch<WpServicePost[]>('/wp/v2/services', {
    query: {
      slug,
      per_page: 1,
      status: 'publish',
      _embed: SERVICE_EMBED,
    },
  });
  return posts[0] ?? null;
}

/**
 * Full slim index for prev/next. Paginates through WP until all posts collected.
 * Pass `baseOverride` for build-time (nuxt.config) without Nuxt context.
 */
export async function getServiceSlimIndex(
  baseOverride?: string,
): Promise<ServiceSlimItem[]> {
  const perPage = 100;
  let page = 1;
  let totalPages = 1;
  const items: ServiceSlimItem[] = [];
  const base = typeof baseOverride === 'string' ? baseOverride : getWpApiBaseFromEnv();

  while (page <= totalPages) {
    const result = await wpFetchPaginated<SlimIndexRaw[]>(
      '/wp/v2/services',
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
export async function getServiceSlugs(baseOverride?: string): Promise<string[]> {
  const index = await getServiceSlimIndex(baseOverride ?? getWpApiBaseFromEnv());
  return index.map((item) => item.slug).filter(Boolean);
}
