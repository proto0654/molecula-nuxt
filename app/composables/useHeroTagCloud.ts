import { normalizeHeroTagCloud } from '~/domain/hero';
import type { HeroTag } from '~/types/wp';

export function useHeroTagCloud() {
  const { acf, pending, error, refresh } = useThemeOptionsAcfData();

  const tags = computed((): HeroTag[] => normalizeHeroTagCloud(acf.value));

  return {
    tags,
    pending,
    error,
    refresh,
  };
}
