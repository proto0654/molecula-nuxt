import type { ThemeOptionsAcf } from '~/types/wp';
import { UI_STRING_KEYS, type UiStringKey } from '~/types/wp/uiStrings';
import { emptyToNull } from '~/domain/wp';

type FieldRow = {
  field: string;
  wp: 'ok' | 'empty';
  wired: boolean;
  consumer: string;
};

/** Where each UI string key is consumed (or planned). */
const UI_STRING_CONSUMERS: Record<UiStringKey, { wired: boolean; consumer: string }> = {
  footer_disclaimer: { wired: true, consumer: 'SiteFooterLegal ← options.footer' },
  footer_cookie_notice: { wired: true, consumer: 'SiteFooterLegal ← options.footer' },
  footer_copyright: { wired: true, consumer: 'SiteFooterLegal ← options.footer' },
  contact_popup_title: { wired: true, consumer: 'useContacts → contact.vue section h2 + SEO title' },
  contact_popup_text: { wired: true, consumer: 'useContacts → contact.vue intro' },
  header_portfolio_label: { wired: false, consumer: '(not wired — no off-home portfolio chip in hero chrome)' },
  header_portfolio_aria: { wired: false, consumer: '(not wired)' },
  header_about_label: { wired: false, consumer: '(not wired)' },
  header_about_aria: { wired: false, consumer: '(not wired)' },
  header_home_aria: { wired: true, consumer: 'SiteHeader / MobileNavOverlay logo aria' },
  drawer_open_aria: { wired: true, consumer: 'SiteHeader menu btn aria (closed)' },
  drawer_close_aria: { wired: true, consumer: 'SiteHeader menu btn aria (open)' },
  drawer_menu_aria: { wired: true, consumer: 'MobileNavOverlay dialog aria' },
  case_nav_see_also: { wired: true, consumer: 'DetailNav section label' },
  case_nav_prev_label: { wired: true, consumer: 'DetailNav prev' },
  case_nav_next_label: { wired: true, consumer: 'DetailNav next' },
  case_nav_none: { wired: true, consumer: 'DetailNav empty prev/next slot' },
  portfolio_heading_current: { wired: true, consumer: 'portfolio/index.vue' },
  portfolio_heading_legacy: { wired: false, consumer: '(not wired — legacy category archive TBD)' },
  portfolio_link_current: { wired: false, consumer: '(not wired — legacy category link TBD)' },
  portfolio_archive_description: { wired: true, consumer: 'portfolio/index.vue SEO' },
  seo_hidden_h1: { wired: true, consumer: 'index.vue home SEO' },
  lang_switch_aria: { wired: false, consumer: '(not wired — /en/ locale switch TBD)' },
  hero_order_label: { wired: true, consumer: 'normalizeServiceChrome → service detail CTA' },
  hero_portfolio_label: { wired: false, consumer: '(not wired — hero portfolio shortcut TBD)' },
  hero_logo_alt: { wired: true, consumer: 'SiteHeader / MobileNavOverlay logo aria fallback' },
  services_section_heading: { wired: true, consumer: 'normalizeServiceChrome' },
  services_price_from: { wired: true, consumer: 'normalizeServiceChrome' },
  services_heading_archive: { wired: true, consumer: 'services/index.vue' },
  services_archive_description: { wired: true, consumer: 'services/index.vue SEO' },
  services_back_to_archive: { wired: true, consumer: 'services/[slug].vue' },
  case_thanks_message: { wired: false, consumer: '(not wired — case page thanks block TBD)' },
  case_back_to_portfolio: { wired: true, consumer: 'portfolio/[slug].vue' },
  case_mobile_signature_default_heading: {
    wired: false,
    consumer: '(not wired — CaseMobileSignature fallback TBD)',
  },
  case_mobile_signature_default_text: {
    wired: false,
    consumer: '(not wired — CaseMobileSignature fallback TBD)',
  },
  case_content_default_heading: { wired: false, consumer: '(not wired — case content fallback TBD)' },
  case_content_default_text: { wired: false, consumer: '(not wired — case content fallback TBD)' },
  screenshot_lightbox_dialog_label: { wired: true, consumer: 'CaseLightbox role=dialog aria-label fallback' },
  screenshot_lightbox_close_aria: { wired: true, consumer: 'CaseLightbox close/backdrop' },
  screenshot_lightbox_toggle_aria: { wired: true, consumer: 'CaseLightbox prev/next nav' },
};

const STRUCTURAL_FIELDS: Array<{
  field: keyof ThemeOptionsAcf | string;
  wired: boolean;
  consumer: string;
  isEmpty: (acf: ThemeOptionsAcf | undefined) => boolean;
}> = [
  {
    field: 'hero_nav_items',
    wired: true,
    consumer: 'MolecularHero → mergeHeroNavigation',
    isEmpty: (acf) => !acf?.hero_nav_items || !Array.isArray(acf.hero_nav_items) || !acf.hero_nav_items.length,
  },
  {
    field: 'hero_tag_cloud',
    wired: true,
    consumer: 'useHeroTagCloud',
    isEmpty: (acf) => !acf?.hero_tag_cloud || !Array.isArray(acf.hero_tag_cloud) || !acf.hero_tag_cloud.length,
  },
  {
    field: 'weblaba_contacts',
    wired: true,
    consumer: 'useContacts',
    isEmpty: (acf) => !acf?.weblaba_contacts || !Array.isArray(acf.weblaba_contacts) || !acf.weblaba_contacts.length,
  },
  {
    field: 'scroll_to_top_*',
    wired: true,
    consumer: 'ScrollToTop ← options.scrollToTop',
    isEmpty: (acf) => acf?.scroll_to_top_enabled === false || acf?.scroll_to_top_enabled === 0,
  },
  {
    field: 'schema_org_*',
    wired: true,
    consumer: 'useSiteIntegrations JSON-LD',
    isEmpty: (acf) =>
      acf?.schema_org_enabled === false ||
      acf?.schema_org_enabled === 0 ||
      acf?.schema_org_enabled === '0',
  },
  {
    field: 'gtm_container_id',
    wired: true,
    consumer: 'useSiteIntegrations GTM script',
    isEmpty: (acf) => !emptyToNull(acf?.gtm_container_id),
  },
];

function wpUiPresent(acf: ThemeOptionsAcf | undefined, key: UiStringKey): boolean {
  const raw = acf?.[key];
  return typeof raw === 'string' && Boolean(emptyToNull(raw));
}

let loggedOnce = false;

/** Dev-only: one-shot coverage report after theme options load. */
export function logThemeOptionsCoverage(acf: ThemeOptionsAcf | undefined): void {
  if (!import.meta.dev || loggedOnce) return;
  loggedOnce = true;

  const uiRows: FieldRow[] = UI_STRING_KEYS.map((key) => ({
    field: key,
    wp: wpUiPresent(acf, key) ? 'ok' : 'empty',
    wired: UI_STRING_CONSUMERS[key].wired,
    consumer: UI_STRING_CONSUMERS[key].consumer,
  }));

  const structuralRows: FieldRow[] = STRUCTURAL_FIELDS.map((entry) => ({
    field: entry.field,
    wp: entry.isEmpty(acf) ? 'empty' : 'ok',
    wired: entry.wired,
    consumer: entry.consumer,
  }));

  const missingInWp = uiRows.filter((r) => r.wp === 'empty');
  const wiredButEmpty = uiRows.filter((r) => r.wired && r.wp === 'empty');
  const notWiredButPresent = uiRows.filter((r) => !r.wired && r.wp === 'ok');
  const structuralEmpty = structuralRows.filter((r) => r.wired && r.wp === 'empty');

  console.group('[theme-options] coverage');
  console.table([...structuralRows, ...uiRows]);
  if (structuralEmpty.length) {
    console.info(
      'Structural fields empty in WP (using code defaults):',
      structuralEmpty.map((r) => r.field),
    );
  }
  if (wiredButEmpty.length) {
    console.info(
      'Wired UI strings empty in WP (using fallbacks):',
      wiredButEmpty.map((r) => r.field),
    );
  }
  if (notWiredButPresent.length) {
    console.info(
      'Present in WP but not wired in UI:',
      notWiredButPresent.map((r) => r.field),
    );
  }
  if (missingInWp.length === uiRows.length && structuralEmpty.length === structuralRows.length) {
    console.warn('No theme option fields returned — check WP API / .env NUXT_PUBLIC_WP_API_BASE');
  }
  console.groupEnd();
}

/** Reset for tests / HMR. */
export function resetThemeOptionsCoverageLog(): void {
  loggedOnce = false;
}
