import type { WpPortfolioPost } from '~/types/wp';
import type {
  Case,
  CaseGalleryItem,
  CaseMobileSlices,
  CaseMobileVisual,
  PortfolioCategory,
} from '~/types/wp';
import type { WpPortfolioCategory } from '~/types/wp';
import type { SiteLocale } from '~/domain/i18n';
import { pickLocalized } from '~/domain/i18n';
import { localizedRenderedTitle, resolveEnContent } from '~/domain/i18n';
import { parseBlockRatio } from '~/domain/portfolio/presentation';
import {
  emptyToNull,
  stripHtmlToPlain,
  normalizeAcfImage,
  normalizeAcfVideo,
  normalizeFeaturedFromEmbed,
  embeddedTagNames,
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

function normalizeMobileSignature(
  acf: WpPortfolioPost['acf'],
  locale: SiteLocale,
): string | null {
  const ru = emptyToNull(
    acf?.podpis_vozle_mokapa_mobily_pravo === false
      ? null
      : acf?.podpis_vozle_mokapa_mobily_pravo,
  );
  const en = emptyToNull(
    acf?.podpis_vozle_mokapa_mobily_pravo_en === false
      ? null
      : acf?.podpis_vozle_mokapa_mobily_pravo_en,
  );
  return pickLocalized(locale, ru, en);
}

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
export function normalizePortfolioPost(
  post: WpPortfolioPost,
  locale: SiteLocale = 'ru',
): Case {
  const acf = post.acf ?? ({} as WpPortfolioPost['acf']);
  const ruContent = emptyToNull(post.content?.rendered);
  const enContent = resolveEnContent(post.meta, acf);
  const contentHtml = pickLocalized(locale, ruContent, enContent);
  const mobileSlices = normalizeMobileSlices(acf);
  const mobile = normalizeMobile(acf, mobileSlices != null);
  const mobileSignatureHtml = normalizeMobileSignature(acf, locale);

  const ruClient = emptyToNull(acf.client === false ? null : acf.client);
  const enClient = emptyToNull(acf.client_en === false ? null : acf.client_en);
  const ruTech = emptyToNull(acf.technologies === false ? null : acf.technologies);
  const enTech = emptyToNull(acf.technologies_en === false ? null : acf.technologies_en);

  return {
    id: post.id,
    slug: post.slug,
    title: localizedRenderedTitle(
      locale,
      post.title?.rendered,
      post.slug,
      post.meta,
      acf,
    ),
    contentHtml,
    excerptHtml: null,
    menuOrder: post.menu_order ?? 0,
    date: post.date,
    featuredImage: normalizeFeaturedFromEmbed(post._embedded?.['wp:featuredmedia']),
    tagIds: post.tags ?? [],
    tags: embeddedTagNames(post._embedded?.['wp:term']),
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
    client: pickLocalized(locale, ruClient, enClient),
    projectUrl: emptyToNull(acf.project_url === false ? null : acf.project_url),
    technologies: pickLocalized(locale, ruTech, enTech),
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

/** Plain-text description for SEO meta (from CMS body, not WP excerpt). */
export function caseExcerptPlain(c: Case): string | null {
  return stripHtmlToPlain(c.contentHtml);
}
