export type PortfolioBackdropState = {
  url: string | null;
  slug: string | null;
  /** Case accent for solid overlay; null = no tint. */
  accent: string | null;
};

function isPortfolioPath(path: string): boolean {
  return path === '/portfolio' || path.startsWith('/portfolio/');
}

function isCasePath(path: string): boolean {
  return /^\/portfolio\/[^/]+\/?$/.test(path);
}

/**
 * Case-route featured wash (layout layer).
 * Archive hover is CSS-only on each row — no JS preview here.
 */
export function usePortfolioBackdrop() {
  const state = useState<PortfolioBackdropState>('portfolio-backdrop', () => ({
    url: null,
    slug: null,
    accent: null,
  }));

  function commit(
    url: string | null,
    slug: string | null,
    accent: string | null = null,
  ) {
    if (
      state.value.url === url &&
      state.value.slug === slug &&
      state.value.accent === accent
    ) {
      return;
    }
    state.value = { url, slug, accent };
  }

  function clear() {
    commit(null, null, null);
  }

  return {
    state: readonly(state),
    commit,
    clear,
    isPortfolioPath,
    isCasePath,
  };
}
