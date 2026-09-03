import { getMoleculeHeroPages } from '~/api';
import {
  logMoleculeHeroNavCoverage,
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

  const rows = computed(() => normalizeMoleculeHeroPages(data.value ?? []));

  const navItems = computed(() => mergeHeroNavigation(rows.value));

  watch(
    [rows, pending, error, status],
    () => {
      if (pending.value || status.value === 'idle') return;
      if (error.value) {
        if (import.meta.dev) {
          console.warn('[molecule-hero-nav] fetch error', error.value);
        }
        return;
      }
      if (status.value !== 'success') return;
      logMoleculeHeroNavCoverage(rows.value);
    },
    { immediate: true },
  );

  return { navItems, rows, pending, error, refresh, status };
}
