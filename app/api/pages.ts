import type { WpPage } from '~/types/wp';
import { MOLECULE_PAGE_SLUGS } from '~/lib/navigation/moleculePageSlugs';
import { wpFetch } from './client';

export async function getPage(slug: string): Promise<WpPage | null> {
  const pages = await wpFetch<WpPage[]>('/wp/v2/pages', {
    query: {
      slug,
      per_page: 1,
      status: 'publish',
      _embed: 'wp:term',
    },
  });
  return pages[0] ?? null;
}

/**
 * Five molecule nav pages (title + hero_* ACF).
 * Fetches per slug — WP REST ignores all but one `slug` when several are passed.
 */
export async function getMoleculeHeroPages(): Promise<WpPage[]> {
  const pages = await Promise.all(
    MOLECULE_PAGE_SLUGS.map(async (slug) => {
      const rows = await wpFetch<WpPage[]>('/wp/v2/pages', {
        query: {
          slug,
          per_page: 1,
          status: 'publish',
          _fields: 'id,slug,title,acf,meta',
        },
      });
      return rows[0] ?? null;
    }),
  );
  return pages.filter((page): page is WpPage => page != null);
}
