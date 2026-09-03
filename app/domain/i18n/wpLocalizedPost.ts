import { emptyToNull } from '~/domain/wp';
import type { SiteLocale } from './locale';
import { pickLocalized } from './resolveLocalized';

/** Shared WP REST `meta` i18n fields (services, portfolio, pages). */
export type WpLocalizedMeta = {
  post_title_en?: string | null;
  post_content_en?: string | null;
  weblaba_title_en?: string | null;
};

type LocalizedAcf = {
  post_title_en?: string | null;
  post_content_en?: string | false | null;
};

/** `meta.weblaba_title_en` → `meta.post_title_en` → `acf.post_title_en`. */
export function resolveEnTitle(
  meta: WpLocalizedMeta | undefined,
  acf: LocalizedAcf | undefined,
): string | null {
  return (
    emptyToNull(meta?.weblaba_title_en) ??
    emptyToNull(meta?.post_title_en) ??
    emptyToNull(acf?.post_title_en)
  );
}

/** Prefer `meta.post_content_en` (clean Gutenberg) over `acf.post_content_en`. */
export function resolveEnContent(
  meta: WpLocalizedMeta | undefined,
  acf: LocalizedAcf | undefined,
): string | null {
  const fromMeta = emptyToNull(meta?.post_content_en);
  if (fromMeta) return fromMeta;
  const rawAcf = acf?.post_content_en;
  if (rawAcf === false) return null;
  return emptyToNull(rawAcf ?? null);
}

export function localizedRenderedTitle(
  locale: SiteLocale,
  ruRendered: string | null | undefined,
  fallbackSlug: string,
  meta: WpLocalizedMeta | undefined,
  acf: LocalizedAcf | undefined,
): string {
  const ru = emptyToNull(ruRendered) ?? fallbackSlug;
  const en = resolveEnTitle(meta, acf);
  return pickLocalized(locale, ru, en) ?? fallbackSlug;
}

export function localizedSlimTitle(
  locale: SiteLocale,
  ruTitle: string,
  slug: string,
  titleEn: string | null | undefined,
): string {
  return pickLocalized(locale, ruTitle, emptyToNull(titleEn ?? null)) ?? slug;
}
