import { getPage } from '~/api/pages';
import { normalizeAboutPage } from '~/domain/about';
import type { AboutPage } from '~/types/wp';

export function useAbout() {
  const { data, pending, error, refresh } = useAsyncData(
    'about-page',
    async (): Promise<AboutPage> => {
      const raw = await getPage('about');
      if (!raw) {
        throw createError({ statusCode: 404, statusMessage: 'About not found', fatal: true });
      }
      return normalizeAboutPage(raw);
    },
  );

  return {
    page: computed(() => data.value ?? null),
    pending,
    error,
    refresh,
  };
}
