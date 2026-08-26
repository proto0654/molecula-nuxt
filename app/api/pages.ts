import type { WpPage } from '~/types/wp';
import { wpFetch } from './client';

export async function getPage(slug: string): Promise<WpPage | null> {
  const pages = await wpFetch<WpPage[]>('/wp/v2/pages', {
    query: {
      slug,
      per_page: 1,
      status: 'publish',
    },
  });
  return pages[0] ?? null;
}
