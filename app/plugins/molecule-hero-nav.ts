import { getMoleculeHeroPages } from '~/api';
import { preferStaticCachedData } from '~/composables/preferStaticCachedData';
import { MOLECULE_HERO_PAGES_KEY } from '~/composables/useMoleculeHeroNav';
import type { WpPage } from '~/types/wp';

/** Prefetch hero nav pages during generate so prod SPA never client-fetches WP. */
export default defineNuxtPlugin({
  name: 'molecule-hero-nav',
  parallel: false,
  async setup(nuxtApp) {
    const { data } = await useAsyncData(
      MOLECULE_HERO_PAGES_KEY,
      () => getMoleculeHeroPages(),
      {
        server: true,
        lazy: false,
        default: (): WpPage[] => [],
        getCachedData(key, app, ctx) {
          return preferStaticCachedData<WpPage[]>(key, app, ctx);
        },
      },
    );
    if (import.meta.server && data.value?.length) {
      nuxtApp.payload.data[MOLECULE_HERO_PAGES_KEY] = data.value;
    }
  },
});
