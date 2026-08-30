export type ArchiveReturnScope = 'portfolio' | 'services';

export type ArchiveReturnState = {
  page: number;
  slug: string;
  y: number;
};

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
  services: { key: 'wl:archive-return:services', basePath: '/services' },
};

function canUseStorage(): boolean {
  return import.meta.client && typeof sessionStorage !== 'undefined';
}

export function saveArchiveReturn(
  state: ArchiveReturnState,
  scope: ArchiveReturnScope = 'portfolio',
): void {
  if (!canUseStorage()) return;
  try {
    sessionStorage.setItem(SCOPE_CONFIG[scope].key, JSON.stringify(state));
  } catch {
    // Quota / private mode — restoration is best-effort.
  }
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
  } catch {
    // ignore
  }
  return state;
}

export function archiveIndexHref(
  state?: ArchiveReturnState | null,
  scope: ArchiveReturnScope = 'portfolio',
): string {
  const page = state?.page ?? peekArchiveReturn(scope)?.page ?? 1;
  const base = SCOPE_CONFIG[scope].basePath;
  if (page <= 1) return base;
  return `${base}?page=${page}`;
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
