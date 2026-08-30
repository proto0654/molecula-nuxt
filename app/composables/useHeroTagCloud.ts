import { getThemeOptions } from '~/api';
import { normalizeHeroTagCloud } from '~/domain/hero';
import type { HeroTag } from '~/types/wp';

export function useHeroTagCloud() {
  const { data, pending, error, refresh } = useAsyncData(
    'hero-tag-cloud',
    async (): Promise<HeroTag[]> => {
      return normalizeHeroTagCloud(await getThemeOptions());
    },
  );

  return {
    tags: computed(() => data.value ?? []),
    pending,
    error,
    refresh,
  };
}
