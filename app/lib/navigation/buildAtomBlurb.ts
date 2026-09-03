import { prefersTouchInput } from '../a11y/pointerInput';
import { missingUiString } from '../../domain/options/missingUiString';
import type { NavigationItem } from './navigationConfig';

const HOME_ITEM_ID = 'home';

type NavVerbCopy = {
  click: string;
  tap: string;
};

let verbCopy: NavVerbCopy = {
  click: missingUiString('nav_verb_click'),
  tap: missingUiString('nav_verb_tap'),
};

/** Called from hero chrome hydrate (`setChromeCopy`). */
export function setNavVerbCopy(copy: NavVerbCopy): void {
  verbCopy = {
    click: copy.click.trim() || missingUiString('nav_verb_click'),
    tap: copy.tap.trim() || missingUiString('nav_verb_tap'),
  };
}

/** Second part of the typewriter blurb — verb + optional CTA tail from WP. */
export function navBlurbCta(
  tail = '',
  touch = prefersTouchInput(),
): string {
  const verb = touch ? verbCopy.tap : verbCopy.click;
  return `${verb}${tail}`;
}

/** Descriptive part 1 + optional click/tap CTA for navigable atoms. */
export function buildAtomBlurb(item: NavigationItem): string {
  if (item.id === HOME_ITEM_ID || item.route === '/') {
    return item.blurb;
  }
  if (!item.blurb) return '';
  return `${item.blurb} / ${navBlurbCta(item.blurbCta ?? '')}`;
}

export { subscribePointerInput } from '../a11y/pointerInput';
