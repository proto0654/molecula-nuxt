import { getMoleculeHeroPages } from '~/api';
import {
  mergeHeroNavigation,
  normalizeMoleculeHeroPages,
} from '~/domain/hero';
import { preferStaticCachedData } from '~/composables/preferStaticCachedData';
import type { WpPage } from '~/types/wp';

export const MOLECULE_HERO_PAGES_KEY = 'molecule-hero-pages';

/**
 * Molecule nav copy from WP pages (SSG payload in prod; live in `nuxt dev`).
 * Structure stays mountable with empty copy until pages resolve.
 */
export function useMoleculeHeroNav() {
  const { locale } = useLocale();
  const nuxtApp = useNuxtApp();

  const { data, pending, error, refresh, status } = useAsyncData(
    MOLECULE_HERO_PAGES_KEY,
    () => getMoleculeHeroPages(),
    {
      lazy: true,
      server: true,
      default: (): WpPage[] => [],
      getCachedData(key, app, ctx) {
        return preferStaticCachedData<WpPage[]>(key, app ?? nuxtApp, ctx);
      },
    },
  );

  const rows = computed(() =>
    normalizeMoleculeHeroPages(data.value ?? [], locale.value),
  );

  const navItems = computed(() => mergeHeroNavigation(rows.value, locale.value));

  return { navItems, rows, pending, error, refresh, status };
}
