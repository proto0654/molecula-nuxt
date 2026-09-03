import { emptyToNull } from '~/domain/wp';
import type { SiteLocale } from './locale';

/**
 * EN: non-empty EN → else RU. RU route: RU only.
 * Both values should be pre-normalized with emptyToNull where applicable.
 */
export function pickLocalized(
  locale: SiteLocale,
  ru: string | null | undefined,
  en: string | null | undefined,
): string | null {
  const ruValue = emptyToNull(ru ?? null);
  if (locale !== 'en') return ruValue;
  const enValue = emptyToNull(en ?? null);
  return enValue ?? ruValue;
}

/** Read a Theme Options field with optional `${key}_en` pair on ACF. */
export function pickLocalizedOption<T extends Record<string, unknown>>(
  locale: SiteLocale,
  acf: T | undefined,
  key: string,
): string | null {
  if (!acf) return null;
  const ruRaw = acf[key];
  const ru = typeof ruRaw === 'string' ? emptyToNull(ruRaw) : null;
  if (locale !== 'en') return ru;
  const enKey = `${key}_en`;
  const enRaw = acf[enKey];
  const en = typeof enRaw === 'string' ? emptyToNull(enRaw) : null;
  return en ?? ru;
}
