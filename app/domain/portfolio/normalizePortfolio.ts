import type { WpPortfolioPost } from '~/types/wp';
import type {
  Case,
  CaseGalleryItem,
  CaseMobileSlices,
  CaseMobileVisual,
  PortfolioCategory,
} from '~/types/wp';
import type { WpPortfolioCategory } from '~/types/wp';
import { parseBlockRatio } from '~/domain/portfolio/presentation';
import {
  emptyToNull,
  stripHtmlToPlain,
  normalizeAcfImage,
  normalizeAcfVideo,
  normalizeFeaturedFromEmbed,
} from '~/domain/wp';

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

const DEFAULT_BLOCK_RATIO = '1/2.3';

/**
 * Tall mobile screenshot → slice grid.
 * `block_ratio` defaults to 1/2.3 when screen-mobile is set (legacy default)
 * so filled screen-mobile is never dropped for a missing ratio field.
 */
function normalizeMobileSlices(
  acf: WpPortfolioPost['acf'],
): CaseMobileSlices | null {
  const image = normalizeAcfImage(acf?.['screen-mobile']);
  if (!image) return null;
  if (image.width == null || image.height == null) return null;
  if (image.width <= 0 || image.height <= 0) return null;

  const ratioRaw = emptyToNull(acf?.block_ratio === false ? null : acf?.block_ratio);
  const ratio =
    ratioRaw && parseBlockRatio(ratioRaw) ? ratioRaw : DEFAULT_BLOCK_RATIO;
  return { image, ratio };
}

/** Caption beside mockup / before slices — never drop when media is slices-only. */
function normalizeMobileSignature(acf: WpPortfolioPost['acf']): string | null {
  return emptyToNull(
    acf?.podpis_vozle_mokapa_mobily_pravo === false
      ? null
      : acf?.podpis_vozle_mokapa_mobily_pravo,
  );
}

/**
 * Phone composite / mobile specimen.
 * Prefer screenshot_image (ready mockup). If absent and slices cannot run,
 * fall back to screen-mobile so filled ACF media is never discarded.
 * screenshot_image can coexist with slices — both sections render.
 */
function normalizeMobile(
  acf: WpPortfolioPost['acf'],
  hasSlices: boolean,
): CaseMobileVisual | null {
  const composite = normalizeAcfImage(acf?.screenshot_image);
  if (composite) return { image: composite };

  if (hasSlices) return null;

  const fallback = normalizeAcfImage(acf?.['screen-mobile']);
  if (!fallback) return null;
  return { image: fallback };
}

/**
 * Raw WP portfolio post → normalized Case.
 * Absence stays null / empty — never invent placeholders.
 */
export function normalizePortfolioPost(post: WpPortfolioPost): Case {
  const acf = post.acf ?? ({} as WpPortfolioPost['acf']);
  const contentHtml = emptyToNull(post.content?.rendered);
  const excerptHtml = emptyToNull(post.excerpt?.rendered);
  const mobileSlices = normalizeMobileSlices(acf);
  const mobile = normalizeMobile(acf, mobileSlices != null);
  const mobileSignatureHtml = normalizeMobileSignature(acf);

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
    mobileSlices,
    mobileSignatureHtml,
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
