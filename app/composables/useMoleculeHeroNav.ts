import { getMoleculeHeroPages } from '~/api';
import {
  mergeHeroNavigation,
  normalizeMoleculeHeroPages,
} from '~/domain/hero';
import type { WpPage } from '~/types/wp';

/**
 * Molecule nav copy from WP pages.
 * Client-only fetch so SSR never caches an empty payload that blocks refresh.
 * Structure stays mountable with empty copy until pages resolve.
 */
export function useMoleculeHeroNav() {
  const { locale } = useLocale();

  const { data, pending, error, refresh, status } = useAsyncData(
    'molecule-hero-pages',
    () => getMoleculeHeroPages(),
    {
      lazy: true,
      server: false,
      default: (): WpPage[] => [],
      getCachedData: () => undefined,
    },
  );

  const rows = computed(() =>
    normalizeMoleculeHeroPages(data.value ?? [], locale.value),
  );

  const navItems = computed(() => mergeHeroNavigation(rows.value, locale.value));

  return { navItems, rows, pending, error, refresh, status };
}
