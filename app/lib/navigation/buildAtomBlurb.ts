import { prefersTouchInput } from '../a11y/pointerInput';
import type { NavigationItem } from './navigationConfig';

const HOME_ITEM_ID = 'home';
const DEFAULT_CTA_TAIL = ' для перехода';

/** Second part of the typewriter blurb — verb + tail (tail includes its own leading space or punctuation). */
export function navBlurbCta(
  tail = DEFAULT_CTA_TAIL,
  touch = prefersTouchInput(),
): string {
  const verb = touch ? 'тапай' : 'кликай';
  return `${verb}${tail}`;
}

/** Descriptive part 1 + optional click/tap CTA for navigable atoms. */
export function buildAtomBlurb(item: NavigationItem): string {
  if (item.id === HOME_ITEM_ID || item.route === '/') {
    return item.blurb;
  }
  return `${item.blurb} / ${navBlurbCta(item.blurbCta ?? DEFAULT_CTA_TAIL)}`;
}

export { subscribePointerInput } from '../a11y/pointerInput';
