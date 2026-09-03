export {
  normalizePortfolioPost,
  normalizePortfolioCategory,
  caseExcerptPlain,
} from './normalizePortfolio';

export {
  getAdjacentCases,
  getCasePosition,
  sortPortfolioSlimIndex,
  type AdjacentCases,
  type CasePosition,
} from './adjacent';

export {
  archiveTitlePlain,
  archiveSpecimenImage,
  archiveSpecimenUrl,
  archiveYear,
  archiveMetaLabel,
  categoryNameMap,
  type ArchiveEntry,
} from './archive';

export {
  LEGACY_CATEGORY_SLUG,
  resolveLegacyCategoryId,
  isLegacyCategoryIds,
  isLegacySlimItem,
  filterSlimByShelf,
  shelfForCategoryIds,
  archiveScopeForShelf,
  shelfCounts,
  withCountLabel,
  resolveCaseShelfFromSlim,
  getCasePositionInShelf,
  getCasePositionForSlug,
  type PortfolioShelf,
} from './shelf';

export {
  getCaseComposition,
  getCaseSectionNumbers,
  caseHasSlices,
  getCaseScreenItems,
  isCaseScreensLandingOnly,
  balanceCaseScreenColumns,
  padCaseIndex,
  type CaseSectionKey,
  type CaseSectionTone,
  type CaseSectionSpec,
  type CaseSectionNumbers,
  type CaseComposition,
  type CaseScreenItem,
  type CaseScreenColumnItem,
} from './presentation';
