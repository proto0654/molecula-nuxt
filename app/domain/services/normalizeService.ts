import type { WpServicePost, ThemeOptionsAcf } from '~/types/wp';
import type { Service, ServiceChrome, ServiceOffer } from '~/types/wp';
import {
  emptyToNull,
  stripHtmlToPlain,
  normalizeFeaturedFromEmbed,
  embeddedTagNames,
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

function normalizeOffers(post: WpServicePost): ServiceOffer[] {
  const repeater = post.acf?.['service-repeater'];
  if (!repeater || repeater === false || !Array.isArray(repeater)) return [];

  const used = new Map<string, number>();
  const offers: ServiceOffer[] = [];

  for (let i = 0; i < repeater.length; i += 1) {
    const row = repeater[i]!;
    const title = emptyToNull(row.cf_title);
    const textHtml = emptyToNull(row.cf_text);
    const price = emptyToNull(row.cf_price);
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

/**
 * Raw WP service post → Service. RU fields only; EN keys stay on the raw type.
 * Empty repeater → []. Featured is listing-only; still stored for the archive.
 */
export function normalizeServicePost(post: WpServicePost): Service {
  return {
    id: post.id,
    slug: post.slug,
    title: emptyToNull(post.title?.rendered) ?? post.slug,
    contentHtml: emptyToNull(post.content?.rendered),
    excerptHtml: emptyToNull(post.excerpt?.rendered),
    menuOrder: post.menu_order ?? 0,
    date: post.date,
    featuredImage: normalizeFeaturedFromEmbed(post._embedded?.['wp:featuredmedia']),
    tagIds: post.tags ?? [],
    tags: embeddedTagNames(post._embedded?.['wp:term']),
    offers: normalizeOffers(post),
  };
}

export function normalizeServiceChrome(acf: ThemeOptionsAcf | undefined): ServiceChrome {
  return {
    sectionHeading: emptyToNull(acf?.services_section_heading),
    priceFrom: emptyToNull(acf?.services_price_from),
    orderLabel: emptyToNull(acf?.hero_order_label),
  };
}

export function serviceExcerptPlain(service: Service): string | null {
  return stripHtmlToPlain(service.excerptHtml) ?? stripHtmlToPlain(service.contentHtml);
}
