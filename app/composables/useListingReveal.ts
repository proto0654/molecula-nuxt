import type { MaybeRefOrGetter } from 'vue';
import { prefersReducedMotion } from '~/lib/a11y/reducedMotion';
import { whenArchiveRestoreIdle } from '~/lib/navigation/archiveReturn';

const CASE_LIST_SELECTOR =
  '.case-page .case-content__prose :is(ul, .wp-block-list) > li, ' +
  '.case-page .case-mobile__caption :is(ul, .wp-block-list) > li, ' +
  '.case-page .case-mobile-signature__prose :is(ul, .wp-block-list) > li, ' +
  '.case-page .case-content__prose ol > li, ' +
  '.case-page .case-mobile__caption ol > li, ' +
  '.case-page .case-mobile-signature__prose ol > li';

const ITEM_SELECTOR =
  '.archive-row, [data-enter="tail"], .case-page .case-section:not(.case-nav), .case-page nav.case-nav.case-section, .archive-page nav.case-nav--archive, ' +
  CASE_LIST_SELECTOR;
const VIEW_INSET = 0.08;
const DEFAULT_CAP = 6;
const WILL_CHANGE_MS = 3200;

function doubleRaf(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function isInView(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const inset = vh * VIEW_INSET;
  return rect.bottom > 0 && rect.top < vh - inset;
}

function readCap(scope: HTMLElement): number {
  const raw = getComputedStyle(scope).getPropertyValue('--reveal-cap').trim();
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CAP;
}

function collectItems(scope: HTMLElement): HTMLElement[] {
  return [...scope.querySelectorAll<HTMLElement>(ITEM_SELECTOR)];
}

/**
 * In-view listing rows (and tails) chain with a capped stagger; below-fold
 * items play once on intersect. See docs/MOTION.md.
 */
export function useListingReveal(
  root: MaybeRefOrGetter<HTMLElement | null | undefined>,
  gate: MaybeRefOrGetter<boolean>,
) {
  const processed = new WeakSet<HTMLElement>();
  let io: IntersectionObserver | null = null;
  let mo: MutationObserver | null = null;
  let classifyQueued = false;
  let willTimers = new Map<HTMLElement, number>();
  let generation = 0;

  function clearWill(el: HTMLElement) {
    const prev = willTimers.get(el);
    if (prev != null) window.clearTimeout(prev);
    willTimers.delete(el);
    el.style.willChange = '';
  }

  function armWillChange(el: HTMLElement) {
    el.style.willChange = 'opacity, transform';
    const onEnd = () => {
      el.removeEventListener('animationend', onEnd);
      clearWill(el);
    };
    el.addEventListener('animationend', onEnd);
    willTimers.set(
      el,
      window.setTimeout(() => {
        el.removeEventListener('animationend', onEnd);
        clearWill(el);
      }, WILL_CHANGE_MS),
    );
  }

  function snapReveal(items: HTMLElement[]) {
    for (const item of items) {
      processed.add(item);
      item.dataset.reveal = 'done';
      item.classList.add('is-revealed');
      item.style.removeProperty('--reveal-i');
    }
  }

  function playChain(item: HTMLElement, index: number) {
    processed.add(item);
    item.dataset.reveal = 'chain';
    item.style.setProperty('--reveal-i', String(index));
    item.classList.add('is-revealed');
    armWillChange(item);
  }

  function playIo(item: HTMLElement) {
    processed.add(item);
    item.dataset.reveal = 'in';
    item.style.setProperty('--reveal-i', '0');
    item.classList.add('is-revealed');
    armWillChange(item);
  }

  function ensureIo(): IntersectionObserver {
    if (io) return io;
    io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          io?.unobserve(target);
          playIo(target);
        }
      },
      { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
    );
    return io;
  }

  function classify() {
    const scope = toValue(root);
    if (!scope || !toValue(gate) || !import.meta.client) return;

    const items = collectItems(scope);
    if (!items.length) return;

    if (prefersReducedMotion()) {
      snapReveal(items);
      return;
    }

    const pending = items.filter((item) => !processed.has(item));
    if (!pending.length) return;

    const cap = readCap(scope);
    let chainIndex = 0;

    for (const item of pending) {
      if (isInView(item)) {
        playChain(item, Math.min(chainIndex, cap - 1));
        chainIndex += 1;
      } else {
        processed.add(item);
        item.dataset.reveal = 'io';
        ensureIo().observe(item);
      }
    }
  }

  function queueClassify() {
    if (classifyQueued) return;
    classifyQueued = true;
    requestAnimationFrame(() => {
      classifyQueued = false;
      classify();
    });
  }

  function bindMutation(scope: HTMLElement) {
    if (mo) return;
    mo = new MutationObserver(() => queueClassify());
    mo.observe(scope, { childList: true, subtree: true });
  }

  async function start(gen: number) {
    if (!import.meta.client) return;
    await nextTick();
    await whenArchiveRestoreIdle();
    await doubleRaf();
    if (gen !== generation) return;
    const scope = toValue(root);
    if (!scope || !toValue(gate)) return;
    classify();
    bindMutation(scope);
  }

  function kill() {
    generation += 1;
    io?.disconnect();
    io = null;
    mo?.disconnect();
    mo = null;
    const pending = [...willTimers.keys()];
    for (const el of pending) clearWill(el);
  }

  watch(
    [() => Boolean(toValue(gate)), () => toValue(root) ?? null],
    ([open, scope]) => {
      if (!open || !scope) return;
      generation += 1;
      void start(generation);
    },
    { flush: 'post' },
  );

  onBeforeUnmount(() => {
    kill();
  });
}
