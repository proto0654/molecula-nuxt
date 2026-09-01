/** Common HTML named entities from WordPress content. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  laquo: '\u00AB',
  raquo: '\u00BB',
  mdash: '\u2014',
  ndash: '\u2013',
  hellip: '\u2026',
  copy: '\u00A9',
  reg: '\u00AE',
  trade: '\u2122',
};

/** Decode numeric and named HTML entities (SSR-safe). */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&([a-z]+);/gi, (match, name: string) => {
      const key = name.toLowerCase();
      return NAMED_ENTITIES[key] ?? match;
    });
}

/** Strip tags, decode entities, collapse whitespace. */
export function htmlToPlainText(html: string): string {
  const stripped = html.replace(/<[^>]*>/g, ' ');
  const decoded = decodeHtmlEntities(stripped);
  return decoded.replace(/\s+/g, ' ').trim();
}

/** Demote CMS h1 tags so page keeps a single document h1. */
export function demoteCmsH1(html: string): string {
  return html
    .replace(/<\/?h1\b/gi, (tag) => tag.replace(/h1/i, 'h2'));
}

/** Unwrap anchor tags, preserving inner HTML. Repeated passes handle nested anchors. */
export function unwrapHtmlLinks(html: string): string {
  let result = html;
  let prev = '';
  while (prev !== result) {
    prev = result;
    result = result.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1');
  }
  return result;
}
