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

/** Called once from SiteHeader constructor. */
export function registerChromeInfoSetter(fn: ChromeInfoSetter): void {
  _setter = fn;
}

/** Called from SiteChrome.vue to update the header chrome slot. */
export function setChromeInfo(
  label: string | null,
  linkHref?: string | null,
  linkText?: string | null,
): void {
  _setter?.(label, linkHref, linkText);
}
