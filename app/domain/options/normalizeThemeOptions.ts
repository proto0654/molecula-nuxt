import type { ThemeOptions, ThemeOptionsAcf } from '~/types/wp';
import type { SiteLocale } from '~/domain/i18n';
import { pickLocalizedOption } from '~/domain/i18n';
import { UI_STRING_KEYS, type UiStringKey, type UiStrings } from '~/types/wp/uiStrings';
import { emptyToNull } from '~/domain/wp';

function normalizeUiStrings(
  acf: ThemeOptionsAcf | undefined,
  locale: SiteLocale,
): UiStrings {
  const strings = {} as UiStrings;
  for (const key of UI_STRING_KEYS) {
    strings[key] = pickLocalizedOption(locale, acf, key);
  }
  return strings;
}

function normalizeScrollToTop(acf: ThemeOptionsAcf | undefined) {
  const enabled = acf?.scroll_to_top_enabled;
  const triggerRaw = acf?.scroll_to_top_trigger_px;
  const sizeRaw = acf?.scroll_to_top_size_px;
  const bottomRaw = acf?.scroll_to_top_offset_bottom_px;
  const rightRaw = acf?.scroll_to_top_offset_right_px;

  return {
    enabled: enabled !== false && enabled !== 0 && enabled !== '0',
    triggerPx:
      typeof triggerRaw === 'number' && Number.isFinite(triggerRaw) ? triggerRaw : 400,
    bgColor: emptyToNull(acf?.scroll_to_top_bg_color) ?? '#92DDB9',
    iconColor: emptyToNull(acf?.scroll_to_top_icon_color) ?? '#00160B',
    sizePx: typeof sizeRaw === 'number' && Number.isFinite(sizeRaw) ? sizeRaw : 48,
    offsetBottomPx:
      typeof bottomRaw === 'number' && Number.isFinite(bottomRaw) ? bottomRaw : 0,
    offsetRightPx:
      typeof rightRaw === 'number' && Number.isFinite(rightRaw) ? rightRaw : null,
  };
}

function normalizeSchemaOrg(acf: ThemeOptionsAcf | undefined) {
  const sameAsRaw = acf?.schema_org_same_as;
  const sameAs: string[] = [];
  if (Array.isArray(sameAsRaw)) {
    for (const row of sameAsRaw) {
      const url = emptyToNull(row?.url);
      if (url) sameAs.push(url);
    }
  }

  return {
    enabled:
      acf?.schema_org_enabled !== false &&
      acf?.schema_org_enabled !== 0 &&
      acf?.schema_org_enabled !== '0',
    name: emptyToNull(acf?.schema_org_name),
    url: emptyToNull(acf?.schema_org_url),
    description: emptyToNull(acf?.schema_org_description),
    telephone: emptyToNull(acf?.schema_org_telephone),
    sameAs,
  };
}

/** Raw ACF options → normalized ThemeOptions. */
export function normalizeThemeOptions(
  acf: ThemeOptionsAcf | undefined,
  locale: SiteLocale = 'ru',
): ThemeOptions {
  return {
    ui: normalizeUiStrings(acf, locale),
    scrollToTop: normalizeScrollToTop(acf),
    footer: {
      disclaimer: pickLocalizedOption(locale, acf, 'footer_disclaimer'),
      cookieNotice: pickLocalizedOption(locale, acf, 'footer_cookie_notice'),
      copyright: pickLocalizedOption(locale, acf, 'footer_copyright'),
    },
    schemaOrg: normalizeSchemaOrg(acf),
    gtmContainerId: emptyToNull(acf?.gtm_container_id),
  };
}

export function uiString(
  options: ThemeOptions | null | undefined,
  key: UiStringKey,
): string {
  return options?.ui[key] ?? '';
}
