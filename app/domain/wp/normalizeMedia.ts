import type {
  AcfImage,
  AcfImageSizes,
  AcfVideo,
  WpEmbeddedFeaturedMedia,
  WpEmbeddedTerms,
  WpTag,
} from '~/types/wp';
import type { CaseImage, CaseVideo } from '~/types/wp';

export function emptyToNull(value: string | false | null | undefined): string | null {
  if (value === false || value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function stripHtmlToPlain(html: string | null): string | null {
  if (!html) return null;
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 0 ? text : null;
}

/** Keep only string URL entries from ACF sizes (drop *-width / *-height numbers). */
export function normalizeSizes(sizes: AcfImageSizes | undefined): Record<string, string> {
  if (!sizes) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(sizes)) {
    if (typeof value === 'string' && value.length > 0) {
      out[key] = value;
    }
  }
  return out;
}

export function normalizeAcfImage(image: AcfImage | false | undefined | null): CaseImage | null {
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

export function normalizeAcfVideo(video: AcfVideo | false | undefined | null): CaseVideo | null {
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

export function normalizeFeaturedFromEmbed(
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

/** Flatten `_embedded["wp:term"]` post_tag names; skip empty groups. */
export function embeddedTagNames(groups: WpEmbeddedTerms | undefined): string[] {
  if (!groups?.length) return [];
  const names: string[] = [];
  const seen = new Set<number>();
  for (const group of groups) {
    for (const term of group ?? []) {
      if (!isPostTag(term) || seen.has(term.id)) continue;
      const name = term.name?.trim();
      if (!name) continue;
      seen.add(term.id);
      names.push(name);
    }
  }
  return names;
}

function isPostTag(term: WpTag): boolean {
  return !term.taxonomy || term.taxonomy === 'post_tag';
}
