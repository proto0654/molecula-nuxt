import type { MaybeRefOrGetter } from 'vue';
import { getPortfolioSlimIndex } from '~/api/portfolio';
import { localizedSlimTitle } from '~/domain/i18n';
import type { CasePosition } from '~/domain/portfolio/adjacent';
import {
  archiveScopeForShelf,
  getCasePositionForSlug,
  getCasePositionInShelf,
  resolveCaseShelfFromSlim,
  resolveLegacyCategoryId,
  type PortfolioShelf,
} from '~/domain/portfolio/shelf';
import {
  touchArchiveReturnSlug,
  type ArchiveReturnScope,
} from '~/lib/navigation/archiveReturn';
import { sortPortfolioSlimIndex } from '~/domain/portfolio/adjacent';
import { usePortfolioCategories } from '~/composables/usePortfolio';

/**
 * Shelf-scoped case index + prev/next.
 * Position is derived reactively from slim index so case→case nav stays in the
 * current or legacy selection without waiting on the case payload.
 */
export function usePortfolioCaseNav(slug: MaybeRefOrGetter<string>) {
  const slugRef = computed(() => String(toValue(slug) || ''));
  const { locale } = useLocale();

  function localizePosition(position: CasePosition): CasePosition {
    const localize = (item: CasePosition['prev']) =>
      item
        ? {
            ...item,
            title: localizedSlimTitle(
              locale.value,
              item.title,
              item.slug,
              item.titleEn,
            ),
          }
        : null;
    return {
      ...position,
      prev: localize(position.prev),
      next: localize(position.next),
    };
  }

  const { data: slimIndex } = useAsyncData('portfolio-slim-index', () =>
    getPortfolioSlimIndex(),
  );

  const { data: categories } = usePortfolioCategories();

  const legacyId = computed(() => resolveLegacyCategoryId(categories.value));

  const sortedSlim = computed(() =>
    sortPortfolioSlimIndex(slimIndex.value ?? []),
  );

  const shelf = computed((): PortfolioShelf =>
    resolveCaseShelfFromSlim(slugRef.value, sortedSlim.value, legacyId.value),
  );

  const position = computed((): CasePosition =>
    localizePosition(
      getCasePositionInShelf(
        slugRef.value,
        sortedSlim.value,
        legacyId.value,
      ),
    ),
  );

  const archiveScope = computed((): ArchiveReturnScope =>
    archiveScopeForShelf(shelf.value),
  );

  function positionForSlug(fromSlug: string): CasePosition {
    return localizePosition(
      getCasePositionForSlug(
        fromSlug,
        sortedSlim.value,
        legacyId.value,
      ),
    );
  }

  watch(slugRef, (nextSlug, prevSlug) => {
    if (!nextSlug || nextSlug === prevSlug) return;
    touchArchiveReturnSlug(nextSlug, archiveScopeForShelf(shelf.value));
  });

  return {
    slimIndex,
    categories,
    legacyId,
    shelf,
    position,
    archiveScope,
    positionForSlug,
  };
}
