/** WordPress REST collection limit, shared by build-time and archive requests. */
export const WP_MAX_PER_PAGE = 100;

type SlugPage = { data: unknown; headers: Headers };

function paginationHeader(headers: Headers, name: string): number {
  const raw = headers.get(name);
  if (raw === null || !/^\d+$/.test(raw)) {
    throw new Error(`Missing or invalid ${name}`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) throw new Error(`Invalid ${name}`);
  return value;
}

/** Reject incomplete indexes rather than publishing a partial static site. */
export async function collectCptSlugs(
  cpt: string,
  loadPage: (page: number) => Promise<SlugPage>,
): Promise<string[]> {
  const slugs = new Set<string>();
  let total = 0;
  let totalPages = 1;

  for (let page = 1; page <= totalPages; page += 1) {
    try {
      const { data, headers } = await loadPage(page);
      const pageTotal = paginationHeader(headers, 'x-wp-total');
      const pageCount = paginationHeader(headers, 'x-wp-totalpages');
      if (pageCount !== Math.ceil(pageTotal / WP_MAX_PER_PAGE)) {
        throw new Error('Inconsistent pagination headers');
      }
      if (page > 1 && (pageTotal !== total || pageCount !== totalPages)) {
        throw new Error('Collection changed during pagination');
      }
      total = pageTotal;
      totalPages = pageCount;
      const expected = Math.min(WP_MAX_PER_PAGE, total - (page - 1) * WP_MAX_PER_PAGE);
      if (!Array.isArray(data) || data.length !== expected) {
        throw new Error('Incomplete collection page');
      }
      for (const post of data) {
        const slug = post?.slug;
        if (typeof slug !== 'string' || !slug || /[/\\?#\s]/.test(slug)) {
          throw new Error('Invalid post slug');
        }
        const decoded = decodeURIComponent(slug);
        if (decoded === '.' || decoded === '..' || /[/\\?#\s]/.test(decoded)) {
          throw new Error('Unsafe post slug');
        }
        if (slugs.has(slug)) throw new Error('Duplicate post slug');
        slugs.add(slug);
      }
    } catch (cause) {
      throw new Error(`[prerender] Cannot collect ${cpt} slugs (page ${page})`, { cause });
    }
  }
  return [...slugs];
}

function isUnsupportedIncludeOrder(error: unknown): boolean {
  const data = (error as { data?: { code?: string; data?: { params?: Record<string, unknown> } } })?.data;
  return data?.code === 'rest_invalid_param' && Boolean(data.data?.params?.orderby);
}

/** Fetch complete batches, then restore caller order even when WP ignores sorting. */
export async function collectPostsByIds<T extends { id: number }>(
  ids: readonly number[],
  loadBatch: (ids: number[], orderByInclude: boolean) => Promise<T[]>,
): Promise<T[]> {
  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error('Post ids must be positive integers');
  }
  const uniqueIds = [...new Set(ids)];
  const byId = new Map<number, T>();
  for (let offset = 0; offset < uniqueIds.length; offset += WP_MAX_PER_PAGE) {
    const batch = uniqueIds.slice(offset, offset + WP_MAX_PER_PAGE);
    let posts: T[];
    try {
      posts = await loadBatch(batch, true);
    } catch (error) {
      if (!isUnsupportedIncludeOrder(error)) throw error;
      posts = await loadBatch(batch, false);
    }
    if (!Array.isArray(posts)) throw new Error('Invalid posts response');
    for (const post of posts) byId.set(post.id, post);
    if (batch.some((id) => !byId.has(id))) {
      throw new Error('Incomplete posts batch: the CMS index changed or records are missing');
    }
  }
  return ids.map((id) => byId.get(id)!);
}
