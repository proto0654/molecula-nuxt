/**
 * Raw WordPress / ACF REST shapes as returned by production.
 * @see docs/api-real-response.md
 */

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
  _embedded?: {
    'wp:featuredmedia'?: WpEmbeddedFeaturedMedia[];
  };
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
  acf?: Record<string, unknown>;
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
