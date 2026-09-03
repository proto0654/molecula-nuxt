import { localizedPath, stripLocalePrefix, type SiteLocale } from '~/domain/i18n';

export type ArchiveReturnScope = 'portfolio' | 'portfolio-legacy' | 'services';

export type ArchiveReturnState = {
  page: number;
  slug: string;
  y: number;
};

/** Set when entering a case from an archive row — used for menu/burger return from case pages. */
type CasePortfolioReturnPointer = {
  scope: 'portfolio' | 'portfolio-legacy';
};

const CASE_PORTFOLIO_RETURN_KEY = 'wl:case-portfolio-return';

/** True while archive index is jumping to a restored row (listing measure waits). */
let restoring = false;
const restoreIdle = new Set<() => void>();

/** True while archive pagination is scrolling before new rows are measured. */
let paginating = false;
const paginationIdle = new Set<() => void>();

export function beginArchiveRestore(): void {
  restoring = true;
}

export function endArchiveRestore(): void {
  if (!restoring) return;
  restoring = false;
  for (const fn of restoreIdle) fn();
  restoreIdle.clear();
}

export function isArchiveRestoring(): boolean {
  return restoring;
}

/** Resolves after restore scroll (or immediately if none). */
export function whenArchiveRestoreIdle(): Promise<void> {
  if (!restoring) return Promise.resolve();
  return new Promise((resolve) => {
    restoreIdle.add(() => resolve());
  });
}

export function beginArchivePagination(): void {
  paginating = true;
}

export function endArchivePagination(): void {
  if (!paginating) return;
  paginating = false;
  for (const fn of paginationIdle) fn();
  paginationIdle.clear();
}

export function isArchivePaginating(): boolean {
  return paginating;
}

/** Resolves after pagination scroll (or immediately if none). */
export function whenArchivePaginationIdle(): Promise<void> {
  if (!paginating) return Promise.resolve();
  return new Promise((resolve) => {
    paginationIdle.add(() => resolve());
  });
}

const SCOPE_CONFIG: Record<ArchiveReturnScope, { key: string; basePath: string }> = {
  portfolio: { key: 'wl:archive-return', basePath: '/portfolio' },
  'portfolio-legacy': {
    key: 'wl:archive-return:portfolio-legacy',
    basePath: '/portfolio/legacy',
  },
  services: { key: 'wl:archive-return:services', basePath: '/services' },
};

function canUseStorage(): boolean {
  return import.meta.client && typeof sessionStorage !== 'undefined';
}

/** `/portfolio/:slug` — not archive index or legacy shelf. */
export function isPortfolioCasePath(path: string): boolean {
  const segments = stripLocalePrefix(path).split('/').filter(Boolean);
  if (segments.length !== 2) return false;
  const [head, slug] = segments;
  return head === 'portfolio' && slug !== 'legacy';
}

function isPortfolioArchiveScope(
  scope: ArchiveReturnScope,
): scope is 'portfolio' | 'portfolio-legacy' {
  return scope === 'portfolio' || scope === 'portfolio-legacy';
}

function readCasePortfolioReturnPointer(): CasePortfolioReturnPointer | null {
  if (!canUseStorage()) return null;
  try {
    const raw = sessionStorage.getItem(CASE_PORTFOLIO_RETURN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CasePortfolioReturnPointer>;
    if (parsed.scope === 'portfolio' || parsed.scope === 'portfolio-legacy') {
      return { scope: parsed.scope };
    }
    return null;
  } catch {
    return null;
  }
}

function writeCasePortfolioReturnPointer(scope: 'portfolio' | 'portfolio-legacy'): void {
  if (!canUseStorage()) return;
  try {
    sessionStorage.setItem(
      CASE_PORTFOLIO_RETURN_KEY,
      JSON.stringify({ scope } satisfies CasePortfolioReturnPointer),
    );
  } catch {
    // best-effort
  }
}

function clearCasePortfolioReturnPointer(): void {
  if (!canUseStorage()) return;
  try {
    sessionStorage.removeItem(CASE_PORTFOLIO_RETURN_KEY);
  } catch {
    // ignore
  }
}

export function saveArchiveReturn(
  state: ArchiveReturnState,
  scope: ArchiveReturnScope = 'portfolio',
): void {
  if (!canUseStorage()) return;
  try {
    sessionStorage.setItem(SCOPE_CONFIG[scope].key, JSON.stringify(state));
    if (isPortfolioArchiveScope(scope)) {
      writeCasePortfolioReturnPointer(scope);
    }
  } catch {
    // Quota / private mode — restoration is best-effort.
  }
}

/** Keep archive page/scroll when moving prev/next within the same shelf. */
export function touchArchiveReturnSlug(
  slug: string,
  scope: ArchiveReturnScope,
): void {
  const saved = peekArchiveReturn(scope);
  if (!saved || saved.slug === slug) return;
  saveArchiveReturn({ ...saved, slug }, scope);
}

export function peekArchiveReturn(
  scope: ArchiveReturnScope = 'portfolio',
): ArchiveReturnState | null {
  if (!canUseStorage()) return null;
  try {
    const raw = sessionStorage.getItem(SCOPE_CONFIG[scope].key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ArchiveReturnState>;
    const page = Number(parsed.page);
    const y = Number(parsed.y);
    const slug = typeof parsed.slug === 'string' ? parsed.slug : '';
    if (!slug || !Number.isFinite(page) || page < 1) return null;
    return {
      page,
      slug,
      y: Number.isFinite(y) ? y : 0,
    };
  } catch {
    return null;
  }
}

export function consumeArchiveReturn(
  scope: ArchiveReturnScope = 'portfolio',
): ArchiveReturnState | null {
  const state = peekArchiveReturn(scope);
  if (!canUseStorage()) return state;
  try {
    sessionStorage.removeItem(SCOPE_CONFIG[scope].key);
    if (isPortfolioArchiveScope(scope)) {
      clearCasePortfolioReturnPointer();
    }
  } catch {
    // ignore
  }
  return state;
}

export function archiveIndexHref(
  state?: ArchiveReturnState | null,
  scope: ArchiveReturnScope = 'portfolio',
  locale: SiteLocale = 'ru',
): string {
  const page = state?.page ?? peekArchiveReturn(scope)?.page ?? 1;
  const base = localizedPath(SCOPE_CONFIG[scope].basePath, locale);
  if (page <= 1) return base;
  return `${base}?page=${page}`;
}

/**
 * From a portfolio case page only: return saved archive shelf + pagination.
 * Null when not on a case or when the case was not opened from an archive row.
 */
export function resolveCasePortfolioArchiveHref(
  path: string = typeof window !== 'undefined' ? window.location.pathname : '/',
  locale: SiteLocale = 'ru',
): string | null {
  if (!isPortfolioCasePath(path)) return null;
  const pointer = readCasePortfolioReturnPointer();
  if (!pointer) return null;
  const state = peekArchiveReturn(pointer.scope);
  if (!state) return null;
  return archiveIndexHref(state, pointer.scope, locale);
}

/** Jump to the saved row (instant) and release the listing-reveal wait. */
export function restoreArchiveScroll(scope: ArchiveReturnScope = 'portfolio'): void {
  const restored = consumeArchiveReturn(scope);
  if (!restored || !import.meta.client) return;
  beginArchiveRestore();
  requestAnimationFrame(() => {
    const row = document.querySelector<HTMLElement>(
      `[data-slug="${CSS.escape(restored.slug)}"]`,
    );
    if (row) {
      row.scrollIntoView({ block: 'center', behavior: 'auto' });
    } else {
      window.scrollTo({ top: restored.y, behavior: 'auto' });
    }
    endArchiveRestore();
  });
}
