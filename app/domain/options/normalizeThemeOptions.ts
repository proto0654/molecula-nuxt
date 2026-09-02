import type {
  HeroNavItemRow,
  ScrollToTopSettings,
  ThemeOptions,
  ThemeOptionsAcf,
} from '~/types/wp';
import { UI_STRING_KEYS, type UiStringKey, type UiStrings } from '~/types/wp/uiStrings';
import { emptyToNull } from '~/domain/wp';

function normalizeUiStrings(acf: ThemeOptionsAcf | undefined): UiStrings {
  const strings = {} as UiStrings;
  for (const key of UI_STRING_KEYS) {
    const raw = acf?.[key as keyof ThemeOptionsAcf];
    strings[key] = typeof raw === 'string' ? emptyToNull(raw) : null;
  }
  return strings;
}

function normalizeHeroNavItems(
  rows: ThemeOptionsAcf['hero_nav_items'],
): HeroNavItemRow[] {
  if (!rows || rows === false || !Array.isArray(rows)) return [];
  const items: HeroNavItemRow[] = [];
  for (const row of rows) {
    const navId = emptyToNull(row.nav_id);
    if (!navId) continue;
    items.push({
      navId,
      label: emptyToNull(row.label),
      blurb: emptyToNull(row.blurb),
      blurbCta: emptyToNull(row.blurb_cta),
      usp: emptyToNull(row.usp),
    });
  }
  return items;
}

function normalizeScrollToTop(acf: ThemeOptionsAcf | undefined): ScrollToTopSettings {
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

/** Raw ACF options → normalized ThemeOptions. RU only; EN keys stay on raw type. */
export function normalizeThemeOptions(acf: ThemeOptionsAcf | undefined): ThemeOptions {
  return {
    ui: normalizeUiStrings(acf),
    heroNavItems: normalizeHeroNavItems(acf?.hero_nav_items),
    scrollToTop: normalizeScrollToTop(acf),
    footer: {
      disclaimer: emptyToNull(acf?.footer_disclaimer),
      cookieNotice: emptyToNull(acf?.footer_cookie_notice),
      copyright: emptyToNull(acf?.footer_copyright),
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
