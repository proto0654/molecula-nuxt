import type { CaseImage } from '~/types/wp';
import { caseImageSrcSet, caseImageUrl } from '~/domain/portfolio/presentation';

export type CaseLightboxItem = {
  image: CaseImage;
  /** Technical label e.g. SCREEN / 03 */
  label: string;
};

export type CaseLightboxState = {
  open: boolean;
  items: CaseLightboxItem[];
  index: number;
};

const CASE_LIGHTBOX_KEY = Symbol('caseLightbox');

export function createCaseLightbox() {
  const state = reactive<CaseLightboxState>({
    open: false,
    items: [],
    index: 0,
  });

  const current = computed(() => {
    if (!state.open || state.items.length === 0) return null;
    return state.items[state.index] ?? null;
  });

  const currentUrl = computed(() => {
    const item = current.value;
    if (!item) return null;
    return caseImageUrl(item.image);
  });

  const currentSrcSet = computed(() => {
    const item = current.value;
    if (!item) return null;
    return caseImageSrcSet(item.image);
  });

  const hasMultiple = computed(() => state.items.length > 1);

  function open(items: CaseLightboxItem[], index = 0) {
    if (!items.length) return;
    state.items = items;
    state.index = Math.min(Math.max(0, index), items.length - 1);
    state.open = true;
    if (import.meta.client) {
      document.documentElement.classList.add('case-lightbox-open');
    }
  }

  function close() {
    state.open = false;
    state.items = [];
    state.index = 0;
    if (import.meta.client) {
      document.documentElement.classList.remove('case-lightbox-open');
    }
  }

  function next() {
    if (state.items.length <= 1) return;
    state.index = (state.index + 1) % state.items.length;
  }

  function prev() {
    if (state.items.length <= 1) return;
    state.index = (state.index - 1 + state.items.length) % state.items.length;
  }

  // Wrap so nested ComputedRefs unwrap in templates (inject returns this object).
  return reactive({
    state,
    current,
    currentUrl,
    currentSrcSet,
    hasMultiple,
    open,
    close,
    next,
    prev,
  });
}

export type CaseLightboxApi = ReturnType<typeof createCaseLightbox>;

export function provideCaseLightbox(): CaseLightboxApi {
  const api = createCaseLightbox();
  provide(CASE_LIGHTBOX_KEY, api);
  return api;
}

export function useCaseLightbox(): CaseLightboxApi {
  const api = inject<CaseLightboxApi>(CASE_LIGHTBOX_KEY);
  if (!api) {
    throw new Error('useCaseLightbox() requires provideCaseLightbox() on the case page');
  }
  return api;
}
