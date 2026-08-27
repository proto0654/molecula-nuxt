export type ArchiveReturnScope = 'portfolio' | 'services';

export type ArchiveReturnState = {
  page: number;
  slug: string;
  y: number;
};

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
