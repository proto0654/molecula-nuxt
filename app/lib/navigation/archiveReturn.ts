const STORAGE_KEY = 'wl:archive-return';

export type ArchiveReturnState = {
  page: number;
  slug: string;
  y: number;
};

function canUseStorage(): boolean {
  return import.meta.client && typeof sessionStorage !== 'undefined';
}

export function saveArchiveReturn(state: ArchiveReturnState): void {
  if (!canUseStorage()) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota / private mode — restoration is best-effort.
  }
}

export function peekArchiveReturn(): ArchiveReturnState | null {
  if (!canUseStorage()) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
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

export function consumeArchiveReturn(): ArchiveReturnState | null {
  const state = peekArchiveReturn();
  if (!canUseStorage()) return state;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return state;
}

export function archiveIndexHref(state?: ArchiveReturnState | null): string {
  const page = state?.page ?? peekArchiveReturn()?.page ?? 1;
  if (page <= 1) return '/portfolio';
  return `/portfolio?page=${page}`;
}
