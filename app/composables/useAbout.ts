import { getPage } from '~/api/pages';
import { preferStaticCachedData } from '~/composables/preferStaticCachedData';
import { normalizeAboutPage } from '~/domain/about';
import type { AboutPage } from '~/types/wp';

export function useAbout() {
  const { locale } = useLocale();
  const nuxtApp = useNuxtApp();

  const { data, pending, error, refresh } = useAsyncData(
    () => `about-page-${locale.value}`,
    async (): Promise<AboutPage> => {
      const raw = await getPage('about');
      if (!raw) {
        throw createError({ statusCode: 404, statusMessage: 'About not found', fatal: true });
      }
      return normalizeAboutPage(raw, locale.value);
    },
    {
      watch: [locale],
      getCachedData(key, app, ctx) {
        return preferStaticCachedData<AboutPage>(key, app ?? nuxtApp, ctx);
      },
    },
  );

  return {
    page: computed(() => data.value ?? null),
    pending,
    error,
    refresh,
  };
}
