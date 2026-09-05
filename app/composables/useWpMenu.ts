import { getMenu } from '~/api/menus';
import { preferStaticCachedData } from '~/composables/preferStaticCachedData';
import { normalizeMenu } from '~/domain/menus/normalizeMenu';
import type { NavigationMenu } from '~/types/wp';

/**
 * Load a WP menus/v1 menu by slug (default `main`).
 */
export function useWpMenu(slug: string | Ref<string> = 'main') {
  const slugRef = computed(() => unref(slug));
  const nuxtApp = useNuxtApp();

  const { data, pending, error, refresh } = useAsyncData(
    () => `wp-menu-${slugRef.value}`,
    async () => {
      const raw = await getMenu(slugRef.value);
      return raw ? normalizeMenu(raw) : null;
    },
    {
      watch: [slugRef],
      getCachedData(key, app, ctx) {
        return preferStaticCachedData<NavigationMenu | null>(
          key,
          app ?? nuxtApp,
          ctx,
        );
      },
    },
  );

  return {
    menu: data as Ref<NavigationMenu | null>,
    pending,
    error: error as Ref<Error | null>,
    refresh,
  };
}
