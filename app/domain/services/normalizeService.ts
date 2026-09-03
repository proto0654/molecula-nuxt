import type { WpServicePost, ThemeOptionsAcf } from '~/types/wp';
import type {
  Service,
  ServiceChrome,
  ServiceOffer,
  ServiceRepeaterRow,
  ServiceRepeaterRowEn,
} from '~/types/wp';
import type { SiteLocale } from '~/domain/i18n';
import { pickLocalized, pickLocalizedOption } from '~/domain/i18n';
import { localizedRenderedTitle, resolveEnContent } from '~/domain/i18n';
import {
  emptyToNull,
  stripHtmlToPlain,
  normalizeFeaturedFromEmbed,
  embeddedTagNames,
  unwrapHtmlLinks,
} from '~/domain/wp';

function slugifyOfferTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/['"«»„“”]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

function uniqueAnchor(base: string, used: Map<string, number>): string {
  const count = used.get(base) ?? 0;
  if (count === 0) {
    used.set(base, 1);
    return base;
  }
  const next = count + 1;
  used.set(base, next);
  return `${base}-${next}`;
}

function normalizeOffersFromRows(
  rows: ServiceRepeaterRow[] | ServiceRepeaterRowEn[] | false | undefined,
  ruPriceRows: ServiceRepeaterRow[] | false | undefined,
  enMode: boolean,
): ServiceOffer[] {
  if (!rows || rows === false || !Array.isArray(rows)) return [];

  const ruPrices = Array.isArray(ruPriceRows) ? ruPriceRows : [];
  const used = new Map<string, number>();
  const offers: ServiceOffer[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]!;
    const title = emptyToNull(
      enMode ? (row as ServiceRepeaterRowEn).cf_title_en : (row as ServiceRepeaterRow).cf_title,
    );
    const rawText = emptyToNull(
      enMode ? (row as ServiceRepeaterRowEn).cf_text_en : (row as ServiceRepeaterRow).cf_text,
    );
    const textHtml = rawText ? unwrapHtmlLinks(rawText) : null;
    const ruPrice = emptyToNull(ruPrices[i]?.cf_price);
    const enPrice = enMode
      ? emptyToNull((row as ServiceRepeaterRowEn).cf_price_en)
      : null;
    const price = enMode
      ? (ruPrice ?? enPrice)
      : emptyToNull((row as ServiceRepeaterRow).cf_price);
    if (!title && !textHtml && !price) continue;

    const slugBase = title ? slugifyOfferTitle(title) : '';
    const raw = slugBase || `usluga-${i + 1}`;
    offers.push({
      title,
      textHtml,
      price,
      anchor: uniqueAnchor(raw, used),
    });
  }

  return offers;
}

function normalizeOffers(post: WpServicePost, locale: SiteLocale): ServiceOffer[] {
  const ruRepeater = post.acf?.['service-repeater'];
  if (locale === 'en') {
    const enRepeater = post.acf?.['service-repeater_en'];
    if (enRepeater && enRepeater !== false && Array.isArray(enRepeater) && enRepeater.length > 0) {
      return normalizeOffersFromRows(enRepeater, ruRepeater, true);
    }
  }
  return normalizeOffersFromRows(ruRepeater, undefined, false);
}

/**
 * Raw WP service post → Service.
 * Empty repeater → []. Featured is listing-only; still stored for the archive.
 */
export function normalizeServicePost(
  post: WpServicePost,
  locale: SiteLocale = 'ru',
): Service {
  const acf = post.acf ?? ({} as WpServicePost['acf']);
  const ruContent = emptyToNull(post.content?.rendered);
  const enContent = resolveEnContent(post.meta, acf);

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
    contentHtml: pickLocalized(locale, ruContent, enContent),
    excerptHtml: emptyToNull(post.excerpt?.rendered),
    menuOrder: post.menu_order ?? 0,
    date: post.date,
    featuredImage: normalizeFeaturedFromEmbed(post._embedded?.['wp:featuredmedia']),
    tagIds: post.tags ?? [],
    tags: embeddedTagNames(post._embedded?.['wp:term']),
    offers: normalizeOffers(post, locale),
  };
}

export function normalizeServiceChrome(
  acf: ThemeOptionsAcf | undefined,
  locale: SiteLocale = 'ru',
): ServiceChrome {
  return {
    sectionHeading: pickLocalizedOption(locale, acf, 'services_section_heading'),
    priceFrom: pickLocalizedOption(locale, acf, 'services_price_from'),
    orderLabel: pickLocalizedOption(locale, acf, 'hero_order_label'),
  };
}

export function serviceExcerptPlain(service: Service): string | null {
  return stripHtmlToPlain(service.excerptHtml) ?? stripHtmlToPlain(service.contentHtml);
}
