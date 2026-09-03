/**
 * Raw WordPress / ACF REST shapes as returned by production.
 * @see docs/api-real-response.md
 */

import type { UiStringKey } from './uiStrings';

export type WpRendered = {
  rendered: string;
  protected?: boolean;
};

/** ACF image `sizes` mixes URL strings and *-width / *-height numbers. */
export type AcfImageSizes = Record<string, string | number>;

export type AcfImage = {
  ID: number;
  id: number;
  title: string;
  filename: string;
  filesize?: number;
  url: string;
  link: string;
  alt: string;
  author?: string;
  description?: string;
  caption?: string;
  name?: string;
  status?: string;
  uploaded_to?: number;
  date?: string;
  modified?: string;
  menu_order?: number;
  mime_type: string;
  type?: string;
  subtype?: string;
  icon?: string;
  width: number;
  height: number;
  sizes: AcfImageSizes;
};

export type AcfVideo = {
  ID: number;
  id: number;
  title: string;
  filename: string;
  filesize?: number;
  url: string;
  link: string;
  alt?: string;
  mime_type: string;
  type?: string;
  subtype?: string;
  icon?: string;
  width: number;
  height: number;
};

export type AcfRepeaterRow = {
  repeater_field: AcfImage | false;
};

/**
 * Portfolio ACF. Empty media/repeater come back as `false`.
 * Empty text often comes back as `""`.
 */
export type PortfolioAcf = {
  landing_screen?: AcfImage | false;
  'screen-mobile'?: AcfImage | false;
  screenshot_image?: AcfImage | false;
  repeater?: AcfRepeaterRow[] | false;
  video?: AcfVideo | false;
  block_ratio?: string | false;
  case_dark_bg_color?: string | false;
  case_dark_bg_color_lock?: boolean;
  podpis_vozle_mokapa_mobily_pravo?: string | false;
  podpis_vozle_mokapa_mobily_pravo_en?: string | false;
  post_title_en?: string | null;
  post_content_en?: string | null;
  client?: string | false;
  project_url?: string | false;
  technologies?: string | false;
  client_en?: string | false;
  technologies_en?: string | false;
};

export type WpEmbeddedFeaturedMedia = {
  id: number;
  source_url: string;
  alt_text: string;
  media_details?: {
    width?: number;
    height?: number;
    sizes?: Record<
      string,
      {
        source_url?: string;
        width?: number;
        height?: number;
      }
    >;
  };
};

export type WpLocalizedMeta = {
  post_title_en?: string | null;
  post_content_en?: string | null;
  weblaba_title_en?: string | null;
};

export type WpPortfolioPost = {
  id: number;
  slug: string;
  status: string;
  type: string;
  link: string;
  date: string;
  title: WpRendered;
  content: WpRendered;
  excerpt: WpRendered;
  featured_media: number;
  menu_order: number;
  tags: number[];
  portfolio_category: number[];
  acf: PortfolioAcf;
  meta?: WpLocalizedMeta;
  _embedded?: {
    'wp:featuredmedia'?: WpEmbeddedFeaturedMedia[];
    'wp:term'?: WpEmbeddedTerms;
  };
};

/** RU offer row. `cf_features` exists in CMS but is not rendered. */
export type ServiceRepeaterRow = {
  cf_title?: string;
  cf_text?: string;
  cf_price?: string;
  cf_features?: string;
};

/** EN clone — typed for i18n later; UI ignores these keys. */
export type ServiceRepeaterRowEn = {
  cf_title_en?: string;
  cf_text_en?: string;
  cf_price_en?: string;
  cf_features_en?: string;
};

export type ServiceAcf = {
  'service-thumb'?: AcfImage | false;
  'service-repeater'?: ServiceRepeaterRow[] | false;
  'service-repeater_en'?: ServiceRepeaterRowEn[] | false;
  post_title_en?: string | null;
  post_content_en?: string | null;
};

export type WpServicePost = {
  id: number;
  slug: string;
  status: string;
  type: string;
  link: string;
  date: string;
  title: WpRendered;
  content: WpRendered;
  excerpt: WpRendered;
  featured_media: number;
  menu_order: number;
  tags: number[];
  acf: ServiceAcf;
  meta?: WpLocalizedMeta;
  _embedded?: {
    'wp:featuredmedia'?: WpEmbeddedFeaturedMedia[];
    'wp:term'?: WpEmbeddedTerms;
  };
};

export type AboutRepeaterRow = {
  cf_title?: string;
  cf_text?: string;
};

export type AboutRepeaterRowEn = {
  cf_title_en?: string;
  cf_text_en?: string;
};

/** Molecule HUD copy on the five navigation pages. */
export type MoleculeHeroPageAcf = {
  hero_usp?: string | false;
  hero_blurb?: string | false;
  hero_blurb_cta?: string | false;
  /** Typed for future /en/; UI currently RU-only. */
  hero_usp_en?: string | false;
  hero_blurb_en?: string | false;
  hero_blurb_cta_en?: string | false;
};

export type AboutAcf = MoleculeHeroPageAcf & {
  about_photo?: AcfImage | false;
  about_section_title?: string | false;
  about_section_title_en?: string | false;
  'about-repeater'?: AboutRepeaterRow[] | false;
  'about-repeater_en'?: AboutRepeaterRowEn[] | false;
  about_cta_label?: string | false;
  about_cta_label_en?: string | false;
  post_title_en?: string | null;
  post_content_en?: string | null;
};

/**
 * ACF options used as UI chrome (not post fields).
 * EN keys are typed for i18n later; current UI reads RU only.
 */
export type ContactAcfRow = {
  label?: string | false;
  label_en?: string | false;
  url?: string | false;
  icon?: string | false;
  target?: string | false;
  show_in_header?: boolean;
  show_in_socialbar?: boolean;
};

export type HeroTagCloudRow = {
  label?: string | false;
  tier?: string | false;
};

export type SchemaOrgSameAsRow = {
  url?: string | false;
};

type ThemeOptionsUiFields = Partial<Record<UiStringKey, string | false>>;

export type ThemeOptionsAcf = ThemeOptionsUiFields & {
  services_section_heading?: string | false;
  services_section_heading_en?: string | false;
  services_price_from?: string | false;
  services_price_from_en?: string | false;
  hero_order_label?: string | false;
  hero_order_label_en?: string | false;
  /** EN stub for desktop rail CTA — UI still RU until `/en/`. */
  hud_nav_go_en?: string | false;
  hero_tag_cloud?: HeroTagCloudRow[] | false;
  /** @deprecated Removed from WP Options — molecule copy lives on pages (`hero_*`). */
  hero_nav_items?: false | unknown;
  weblaba_contacts?: ContactAcfRow[] | false;
  contact_popup_title?: string | false;
  contact_popup_title_en?: string | false;
  contact_popup_text?: string | false;
  contact_popup_text_en?: string | false;
  scroll_to_top_enabled?: boolean | number | string | false;
  scroll_to_top_trigger_px?: number | false;
  scroll_to_top_bg_color?: string | false;
  scroll_to_top_icon_color?: string | false;
  scroll_to_top_size_px?: number | false;
  scroll_to_top_offset_bottom_px?: number | false;
  scroll_to_top_offset_right_px?: number | false;
  schema_org_enabled?: boolean | number | string | false;
  schema_org_name?: string | false;
  schema_org_url?: string | false;
  schema_org_description?: string | false;
  schema_org_telephone?: string | false;
  schema_org_same_as?: SchemaOrgSameAsRow[] | false;
  gtm_container_id?: string | false;
};

export type WpAcfOptionsResponse = {
  acf?: ThemeOptionsAcf;
};

export type WpPortfolioCategory = {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent: number;
};

export type WpTag = {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
};

export type WpEmbeddedTerms = WpTag[][];

export type WpPage = {
  id: number;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: WpRendered;
  content: WpRendered;
  excerpt: WpRendered;
  featured_media: number;
  menu_order: number;
  parent: number;
  template: string;
  tags?: number[];
  acf?: AboutAcf | MoleculeHeroPageAcf | Record<string, unknown>;
  meta?: WpLocalizedMeta;
  _embedded?: {
    'wp:featuredmedia'?: WpEmbeddedFeaturedMedia[];
    'wp:term'?: WpEmbeddedTerms;
  };
};

export type WpMedia = {
  id: number;
  slug: string;
  source_url: string;
  alt_text: string;
  mime_type: string;
  media_type: string;
  media_details?: {
    width?: number;
    height?: number;
    sizes?: Record<
      string,
      {
        source_url?: string;
        width?: number;
        height?: number;
      }
    >;
  };
};

/** Public plugin namespace `menus/v1` (core `/wp/v2/menus` is 401). */
export type MenusV1MenuSummary = {
  term_id: number;
  name: string;
  slug: string;
  term_group: number;
  term_taxonomy_id: number;
  taxonomy: string;
  description: string;
  parent: number;
  count: number;
  filter: string;
};

export type MenusV1MenuItem = {
  ID: number;
  db_id: number;
  menu_item_parent: string;
  object_id: string;
  object: string;
  type: string;
  type_label: string;
  title: string;
  url: string;
  target: string;
  attr_title: string;
  description: string;
  classes: string[];
  xfn: string;
  menu_order: number;
  slug?: string;
};

export type MenusV1Menu = MenusV1MenuSummary & {
  items: MenusV1MenuItem[];
};

export type MenusV1LocationEntry = {
  slug: string;
  menu: MenusV1MenuSummary | { errors: Record<string, string[]>; error_data: unknown };
};

export type MenusV1Locations = Record<string, MenusV1LocationEntry>;
