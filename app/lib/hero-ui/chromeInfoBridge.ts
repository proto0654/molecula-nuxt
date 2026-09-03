/**
 * Minimal bridge so Vue components can call SiteHeader.setChromeInfo()
 * without DOM queries or inject/provide plumbing.
 */

type ChromeInfoSetter = (
  label: string | null,
  linkHref?: string | null,
  linkText?: string | null,
) => void;

let _setter: ChromeInfoSetter | null = null;
let _label: string | null = null;
let _href: string | null | undefined = null;
let _text: string | null | undefined = null;

/** Called once from SiteHeader constructor (replays last payload after remount/HMR). */
export function registerChromeInfoSetter(fn: ChromeInfoSetter): void {
  _setter = fn;
  fn(_label, _href, _text);
}

/** Called from SiteChrome.vue to update the header chrome slot. */
export function setChromeInfo(
  label: string | null,
  linkHref?: string | null,
  linkText?: string | null,
): void {
  _label = label;
  _href = linkHref;
  _text = linkText;
  _setter?.(label, linkHref, linkText);
}
