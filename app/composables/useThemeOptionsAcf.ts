import { getThemeOptions } from '~/api';
import { preferStaticCachedData } from '~/composables/preferStaticCachedData';
import type { ThemeOptionsAcf } from '~/types/wp';

export const THEME_OPTIONS_KEY = 'theme-options-acf';

/** SSR-serialized cache — survives dev hydration when payload extraction is off. */
export function useThemeOptionsAcfState() {
  return useState<ThemeOptionsAcf | undefined>(THEME_OPTIONS_KEY, () => undefined);
}

/** Single WP options fetch shared by theme UI, hero tags, contacts, service chrome. */
export function useThemeOptionsAcf() {
  const state = useThemeOptionsAcfState();
  const nuxtApp = useNuxtApp();

  return useAsyncData(
    THEME_OPTIONS_KEY,
    async (): Promise<ThemeOptionsAcf> => {
      const acf = await getThemeOptions();
      state.value = acf;
      return acf;
    },
    {
      server: true,
      lazy: false,
      getCachedData(key, app, ctx) {
        const cached = preferStaticCachedData<ThemeOptionsAcf>(
          key,
          app ?? nuxtApp,
          ctx,
        );
        if (cached !== undefined) {
          state.value = cached;
          return cached;
        }
        return state.value;
      },
    },
  );
}

/** Resolved ACF row (async data or SSR useState). */
export function useThemeOptionsAcfData() {
  const state = useThemeOptionsAcfState();
  const { data, pending, error, refresh } = useThemeOptionsAcf();
  const acf = computed(() => data.value ?? state.value);
  return { acf, pending, error, refresh };
}
