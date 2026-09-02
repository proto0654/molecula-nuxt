import { THEME_OPTIONS_KEY, useThemeOptionsAcf } from '~/composables/useThemeOptionsAcf';

/** Prefetch theme options before layout chrome renders (avoids SSR/client hydration drift). */
export default defineNuxtPlugin({
  name: 'theme-options',
  parallel: false,
  async setup(nuxtApp) {
    const { data } = await useThemeOptionsAcf();
    if (import.meta.server && data.value) {
      nuxtApp.payload.data[THEME_OPTIONS_KEY] = data.value;
    }
  },
});
