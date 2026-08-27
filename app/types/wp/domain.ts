/**
 * Proposed normalized domain models.
 * Absence stays null / empty — never fake placeholders for conditional UI.
 */

export type CaseImage = {
  id: number;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  /** Named size URLs only (e.g. weblaba-screen). No invented WebP keys. */
  sizes: Record<string, string>;
};

export type CaseVideo = {
  id: number;
  url: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  title: string;
};

export type CaseGalleryItem = {
  image: CaseImage;
};

/** Mobile mockup — screenshot_image, or screen-mobile fallback when slices cannot run. */
export type CaseMobileVisual = {
  image: CaseImage;
  /** HTML caption; null if empty / absent. */
  captionHtml: string | null;
};

/**
 * Slice grid — screen-mobile + dimensions; block_ratio defaults to 1/2.3.
 * Keep as dedicated nullable object so `v-if="case.mobileSlices"` works.
 */
export type CaseMobileSlices = {
  image: CaseImage;
  ratio: string;
};

export type Case = {
  id: number;
  slug: string;
  title: string;
  /** Empty CMS content → null (skip CaseContent). */
  contentHtml: string | null;
  excerptHtml: string | null;
  menuOrder: number;
  date: string;
  featuredImage: CaseImage | null;
  tagIds: number[];
  categoryIds: number[];
  accentColor: string | null;
  accentColorLocked: boolean;
  landingScreen: CaseImage | null;
  screenshotImage: CaseImage | null;
  /** Empty array → skip CaseGallery. */
  gallery: CaseGalleryItem[];
  video: CaseVideo | null;
  mobile: CaseMobileVisual | null;
  mobileSlices: CaseMobileSlices | null;
  client: string | null;
  projectUrl: string | null;
  technologies: string | null;
  titleEn: string | null;
};

export type PortfolioCategory = {
  id: number;
  slug: string;
  name: string;
  count: number;
  description: string;
};

export type ServiceOffer = {
  title: string | null;
  textHtml: string | null;
  price: string | null;
  /** Unique slug from cf_title, else usluga-n; collisions get -2, -3. */
  anchor: string;
};

export type Service = {
  id: number;
  slug: string;
  title: string;
  contentHtml: string | null;
  excerptHtml: string | null;
  menuOrder: number;
  date: string;
  featuredImage: CaseImage | null;
  tagIds: number[];
  /** Resolved post_tag names from embed. */
  tags: string[];
  offers: ServiceOffer[];
};

/** Theme-options chrome for service detail (RU only). */
export type ServiceChrome = {
  sectionHeading: string | null;
  priceFrom: string | null;
  orderLabel: string | null;
};

export type AboutSkill = {
  title: string | null;
  textHtml: string | null;
};

export type AboutPage = {
  id: number;
  slug: string;
  title: string;
  contentHtml: string | null;
  photo: CaseImage | null;
  tags: string[];
  sectionTitle: string | null;
  skills: AboutSkill[];
  ctaLabel: string | null;
};

export type NavigationMenuItem = {
  id: number;
  title: string;
  url: string;
  slug: string | null;
  order: number;
  parentId: number;
  classes: string[];
  object: string;
  type: string;
};

export type NavigationMenu = {
  id: number;
  slug: string;
  name: string;
  count: number;
  items: NavigationMenuItem[];
};
