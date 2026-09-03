import type { ThemeOptionsAcf } from '~/types/wp';
import { UI_STRING_KEYS, type UiStringKey } from '~/types/wp/uiStrings';
import { emptyToNull } from '~/domain/wp';

type FieldRow = {
  field: string;
  wp: 'ok' | 'empty';
  wired: boolean;
  skipped?: boolean;
  consumer: string;
};

type UiStringConsumer = {
  wired: boolean;
  /** Present in WP but intentionally unused — not a next-iteration item. */
  skipped?: boolean;
  consumer: string;
};

/** Where each UI string key is consumed (or planned). */
const UI_STRING_CONSUMERS: Record<UiStringKey, UiStringConsumer> = {
  footer_disclaimer: { wired: true, consumer: 'SiteFooterLegal ← options.footer' },
  footer_cookie_notice: { wired: true, consumer: 'SiteFooterLegal ← options.footer' },
  footer_copyright: { wired: true, consumer: 'SiteFooterLegal ← options.footer' },
  contact_popup_title: { wired: true, consumer: 'useContacts → contact.vue section h2 + SEO title' },
  contact_popup_text: { wired: true, consumer: 'useContacts → contact.vue intro' },
  header_portfolio_label: {
    wired: false,
    skipped: true,
    consumer: '(skipped — duplicate of page title / hero nav `work` label)',
  },
  header_portfolio_aria: {
    wired: false,
    skipped: true,
    consumer: '(skipped — duplicate of page title / hero nav `work` label)',
  },
  header_about_label: {
    wired: false,
    skipped: true,
    consumer: '(skipped — duplicate of page title / hero nav `about` label)',
  },
  header_about_aria: {
    wired: false,
    skipped: true,
    consumer: '(skipped — duplicate of page title / hero nav `about` label)',
  },
  header_home_aria: { wired: true, consumer: 'SiteHeader / MobileNavOverlay logo aria' },
  drawer_open_aria: { wired: true, consumer: 'SiteHeader menu btn aria (closed)' },
  drawer_close_aria: { wired: true, consumer: 'SiteHeader menu btn aria (open)' },
  drawer_menu_aria: { wired: true, consumer: 'MobileNavOverlay dialog aria' },
  case_nav_see_also: { wired: true, consumer: 'DetailNav section label' },
  case_nav_prev_label: { wired: true, consumer: 'DetailNav prev' },
  case_nav_next_label: { wired: true, consumer: 'DetailNav next' },
  case_nav_none: { wired: true, consumer: 'DetailNav empty prev/next slot' },
  portfolio_heading_current: { wired: true, consumer: 'portfolio/index.vue' },
  portfolio_heading_legacy: {
    wired: true,
    consumer: 'portfolio/legacy.vue + current archive cross-link',
  },
  portfolio_link_current: {
    wired: true,
    consumer: 'portfolio/legacy.vue cross-link to /portfolio',
  },
  portfolio_archive_description: {
    wired: true,
    consumer: 'portfolio/index.vue + legacy.vue SEO',
  },
  seo_hidden_h1: { wired: true, consumer: 'index.vue home SEO' },
  lang_switch_aria: { wired: true, consumer: 'LocaleSwitch (SiteLocaleSwitch)' },
  hero_order_label: { wired: true, consumer: 'normalizeServiceChrome → service detail CTA' },
  hero_portfolio_label: {
    wired: false,
    skipped: true,
    consumer: '(skipped — duplicate of page title / hero nav `work` label)',
  },
  hero_logo_alt: { wired: true, consumer: 'SiteHeader / MobileNavOverlay logo aria fallback' },
  services_section_heading: { wired: true, consumer: 'normalizeServiceChrome' },
  services_price_from: { wired: true, consumer: 'normalizeServiceChrome' },
  services_heading_archive: { wired: true, consumer: 'services/index.vue' },
  services_archive_description: { wired: true, consumer: 'services/index.vue SEO' },
  services_back_to_archive: { wired: true, consumer: 'services/[slug].vue' },
  services_nav_next_label: { wired: true, consumer: 'DetailNav (services scope)' },
  services_nav_prev_label: { wired: true, consumer: 'DetailNav (services scope)' },
  case_thanks_message: { wired: true, consumer: 'CaseThanks' },
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
  nav_verb_click: { wired: true, consumer: 'buildAtomBlurb ← setNavVerbCopy' },
  nav_verb_tap: { wired: true, consumer: 'buildAtomBlurb ← setNavVerbCopy' },
  hud_menu_open: { wired: true, consumer: 'SiteHeader menu label (closed)' },
  hud_menu_close: { wired: true, consumer: 'SiteHeader menu label (open)' },
  hud_nav_mark: { wired: true, consumer: 'Navigation rail mark' },
  hud_nav_go: { wired: true, consumer: 'Navigation desktop committed CTA' },
  hud_mobile_close: { wired: true, consumer: 'MobileNavOverlay close btn' },
  hud_sys_meta: { wired: true, consumer: 'HudFrame meta' },
  hud_node_idle: { wired: true, consumer: 'SiteHeader node idle' },
  hud_node_format: { wired: true, consumer: 'SiteHeader node format ({nn}/{label})' },
  hud_status_node_idle: { wired: true, consumer: 'MobileNavOverlay status node idle' },
  hud_status_node_format: { wired: true, consumer: 'MobileNavOverlay status node format' },
  hud_status_idle: { wired: true, consumer: 'MobileNavOverlay status idle' },
  hud_status_ready: { wired: true, consumer: 'MobileNavOverlay status ready' },
  hud_status_active: { wired: true, consumer: 'MobileNavOverlay status active' },
  chrome_index_kicker: {
    wired: true,
    consumer: 'SiteChrome + archive/about/contact/privacy kickers',
  },
  chrome_case_label: { wired: true, consumer: 'SiteChrome' },
  chrome_service_label: { wired: true, consumer: 'SiteChrome' },
  case_section_overview: { wired: true, consumer: 'CaseContent' },
  case_section_interface: { wired: true, consumer: 'CaseGallery' },
  case_section_mobile: { wired: true, consumer: 'CaseMobile / CaseMobileSignature' },
  case_section_slices: { wired: true, consumer: 'CaseSlices' },
};

const STRUCTURAL_FIELDS: Array<{
  field: keyof ThemeOptionsAcf | string;
  wired: boolean;
  consumer: string;
  isEmpty: (acf: ThemeOptionsAcf | undefined) => boolean;
}> = [
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
    consumer: 'ScrollToTop ← enabled + triggerPx (HUD chrome; WP colors unused)',
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
    skipped: UI_STRING_CONSUMERS[key].skipped,
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
  const notWiredButPresent = uiRows.filter(
    (r) => !r.wired && !r.skipped && r.wp === 'ok',
  );
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
      'Wired UI strings empty in WP (UI shows [key]):',
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
