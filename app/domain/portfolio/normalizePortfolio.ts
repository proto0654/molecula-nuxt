import type {
  AcfImage,
  AcfImageSizes,
  AcfVideo,
  WpEmbeddedFeaturedMedia,
  WpPortfolioPost,
} from '~/types/wp';
import type {
  Case,
  CaseGalleryItem,
  CaseImage,
  CaseMobileSlices,
  CaseMobileVisual,
  CaseVideo,
  PortfolioCategory,
} from '~/types/wp';
import type { WpPortfolioCategory } from '~/types/wp';

function emptyToNull(value: string | false | null | undefined): string | null {
  if (value === false || value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function stripHtmlToPlain(html: string | null): string | null {
  if (!html) return null;
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 0 ? text : null;
}

/** Keep only string URL entries from ACF sizes (drop *-width / *-height numbers). */
function normalizeSizes(sizes: AcfImageSizes | undefined): Record<string, string> {
  if (!sizes) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(sizes)) {
    if (typeof value === 'string' && value.length > 0) {
      out[key] = value;
    }
  }
  return out;
}

function normalizeAcfImage(image: AcfImage | false | undefined | null): CaseImage | null {
  if (!image || image === false) return null;
  return {
    id: image.id ?? image.ID,
    url: image.url,
    alt: image.alt || '',
    width: typeof image.width === 'number' ? image.width : null,
    height: typeof image.height === 'number' ? image.height : null,
    sizes: normalizeSizes(image.sizes),
  };
}

function normalizeAcfVideo(video: AcfVideo | false | undefined | null): CaseVideo | null {
  if (!video || video === false) return null;
  return {
    id: video.id ?? video.ID,
    url: video.url,
    mimeType: video.mime_type,
    width: typeof video.width === 'number' ? video.width : null,
    height: typeof video.height === 'number' ? video.height : null,
    title: video.title || '',
  };
}

function normalizeFeaturedFromEmbed(
  embedded: WpEmbeddedFeaturedMedia[] | undefined,
): CaseImage | null {
  const media = embedded?.[0];
  if (!media?.source_url) return null;
  const sizes: Record<string, string> = {};
  const rawSizes = media.media_details?.sizes;
  if (rawSizes) {
    for (const [key, entry] of Object.entries(rawSizes)) {
      if (entry?.source_url) sizes[key] = entry.source_url;
    }
  }
  return {
    id: media.id,
    url: media.source_url,
    alt: media.alt_text || '',
    width: media.media_details?.width ?? null,
    height: media.media_details?.height ?? null,
    sizes,
  };
}

function normalizeGallery(acf: WpPortfolioPost['acf']): CaseGalleryItem[] {
  const repeater = acf?.repeater;
  if (!repeater || repeater === false || !Array.isArray(repeater)) return [];
  const items: CaseGalleryItem[] = [];
  for (const row of repeater) {
    const image = normalizeAcfImage(row.repeater_field);
    if (image) items.push({ image });
  }
  return items;
}

function normalizeMobile(acf: WpPortfolioPost['acf']): CaseMobileVisual | null {
  const image = normalizeAcfImage(acf?.['screen-mobile']);
  if (!image) return null;
  const captionHtml = emptyToNull(
    acf?.podpis_vozle_mokapa_mobily_pravo === false
      ? null
      : acf?.podpis_vozle_mokapa_mobily_pravo,
  );
  return { image, captionHtml };
}

function normalizeMobileSlices(
  acf: WpPortfolioPost['acf'],
  mobile: CaseMobileVisual | null,
): CaseMobileSlices | null {
  if (!mobile) return null;
  const ratioRaw = acf?.block_ratio;
  const ratio = emptyToNull(ratioRaw === false ? null : ratioRaw);
  if (!ratio) return null;
  return { image: mobile.image, ratio };
}

/**
 * Raw WP portfolio post → normalized Case.
 * Absence stays null / empty — never invent placeholders.
 */
export function normalizePortfolioPost(post: WpPortfolioPost): Case {
  const acf = post.acf ?? ({} as WpPortfolioPost['acf']);
  const contentHtml = emptyToNull(post.content?.rendered);
  const excerptHtml = emptyToNull(post.excerpt?.rendered);
  const mobile = normalizeMobile(acf);

  return {
    id: post.id,
    slug: post.slug,
    title: emptyToNull(post.title?.rendered) ?? post.slug,
    contentHtml,
    excerptHtml,
    menuOrder: post.menu_order ?? 0,
    date: post.date,
    featuredImage: normalizeFeaturedFromEmbed(post._embedded?.['wp:featuredmedia']),
    tagIds: post.tags ?? [],
    categoryIds: post.portfolio_category ?? [],
    accentColor: emptyToNull(
      acf.case_dark_bg_color === false ? null : acf.case_dark_bg_color,
    ),
    accentColorLocked: Boolean(acf.case_dark_bg_color_lock),
    landingScreen: normalizeAcfImage(acf.landing_screen),
    screenshotImage: normalizeAcfImage(acf.screenshot_image),
    gallery: normalizeGallery(acf),
    video: normalizeAcfVideo(acf.video),
    mobile,
    mobileSlices: normalizeMobileSlices(acf, mobile),
    client: emptyToNull(acf.client === false ? null : acf.client),
    projectUrl: emptyToNull(acf.project_url === false ? null : acf.project_url),
    technologies: emptyToNull(acf.technologies === false ? null : acf.technologies),
    titleEn: emptyToNull(acf.post_title_en),
  };
}

export function normalizePortfolioCategory(cat: WpPortfolioCategory): PortfolioCategory {
  return {
    id: cat.id,
    slug: cat.slug,
    name: cat.name,
    count: cat.count,
    description: cat.description || '',
  };
}

/** Plain-text excerpt for SEO meta. */
export function caseExcerptPlain(c: Case): string | null {
  return stripHtmlToPlain(c.excerptHtml) ?? stripHtmlToPlain(c.contentHtml);
}
