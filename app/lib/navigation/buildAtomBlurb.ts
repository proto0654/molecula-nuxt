import { prefersTouchInput } from '../a11y/pointerInput';
import { missingUiString } from '../../domain/options/missingUiString';
import type { NavigationItem } from './navigationConfig';

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
  // emptyToNull / merge pick trim leading spaces — re-join safely.
  const t = typeof tail === 'string' ? tail.trim() : '';
  if (!t) return verb;
  // `, foo` / `; foo` glue directly; otherwise insert a space (`click to…`).
  if (/^[,.;:!?…]/.test(t)) return `${verb}${t}`;
  return `${verb} ${t}`;
}

/**
 * Descriptive part 1 + optional click/tap CTA for navigable atoms.
 * Hub (`home`) never gets a verb — already on the landing; second click is a no-op route.
 */
export function buildAtomBlurb(item: NavigationItem): string {
  if (!item.blurb) return '';
  if (item.id === 'home' || !item.blurbCta) return item.blurb;
  return `${item.blurb} / ${navBlurbCta(item.blurbCta)}`;
}

export { subscribePointerInput } from '../a11y/pointerInput';
