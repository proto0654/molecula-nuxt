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

const LIST_ITEM_BODY_CLASS = 'case-list-item__body';
const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/** True when `html` is exactly one element (optional surrounding whitespace). */
function isBalancedSingleElement(html: string): boolean {
  const trimmed = html.trim();
  const open = trimmed.match(/^<([a-z][\w-]*)\b[^>]*>/i);
  if (!open) return false;
  const tag = open[1].toLowerCase();
  if (VOID_TAGS.has(tag)) {
    return open[0].length === trimmed.length;
  }

  let depth = 0;
  let i = 0;
  while (i < trimmed.length) {
    if (trimmed[i] !== '<') {
      if (depth === 0 && i > 0) {
        return /^\s*$/.test(trimmed.slice(i));
      }
      i += 1;
      continue;
    }
    const token = trimmed.slice(i).match(new RegExp(`^</?${tag}\\b[^>]*>`, 'i'));
    if (!token) {
      if (depth === 0) return false;
      const skip = trimmed.slice(i).match(/^<\/?[a-z][\w-]*\b[^>]*>/i);
      i += skip ? skip[0].length : 1;
      continue;
    }
    if (token[0].startsWith('</')) {
      depth -= 1;
      i += token[0].length;
      if (depth === 0) {
        return /^\s*$/.test(trimmed.slice(i));
      }
    } else {
      if (depth === 0 && i !== 0) return false;
      depth += 1;
      i += token[0].length;
    }
  }
  return false;
}

function isAlreadyListItemBody(html: string): boolean {
  const trimmed = html.trim();
  const re = new RegExp(
    `^<span\\s+class="${LIST_ITEM_BODY_CLASS}"[^>]*>[\\s\\S]*<\\/span>$`,
    'i',
  );
  return re.test(trimmed) && isBalancedSingleElement(trimmed);
}

function wrapListItemInner(inner: string): string {
  if (!inner.trim()) return inner;
  if (isAlreadyListItemBody(inner)) return inner;
  // One element child already gives `li > *` a single fade target (e.g. Gutenberg `li > p`).
  if (isBalancedSingleElement(inner)) return inner;
  return `<span class="${LIST_ITEM_BODY_CLASS}">${inner}</span>`;
}

/**
 * Wrap mixed `li` contents so listing reveal can fade one `li > *` unit
 * (text nodes + `strong` etc.) without putting opacity on the hairline host.
 */
export function wrapCaseListItemBodies(html: string): string {
  let result = '';
  let i = 0;

  while (i < html.length) {
    const rest = html.slice(i);
    const openMatch = rest.match(/<li\b[^>]*>/i);
    if (!openMatch || openMatch.index == null) {
      result += rest;
      break;
    }

    const absOpen = i + openMatch.index;
    result += html.slice(i, absOpen);
    const openTag = openMatch[0];
    const contentStart = absOpen + openTag.length;

    let depth = 1;
    let pos = contentStart;
    let contentEnd = -1;
    while (pos < html.length) {
      const next = html.slice(pos).match(/<\/?li\b[^>]*>/i);
      if (!next || next.index == null) break;
      const tagStart = pos + next.index;
      const token = next[0];
      if (token.startsWith('</')) {
        depth -= 1;
        if (depth === 0) {
          contentEnd = tagStart;
          break;
        }
      } else {
        depth += 1;
      }
      pos = tagStart + token.length;
    }

    if (contentEnd === -1) {
      result += html.slice(absOpen);
      break;
    }

    const inner = html.slice(contentStart, contentEnd);
    const nested = wrapCaseListItemBodies(inner);
    result += openTag + wrapListItemInner(nested);

    const closeMatch = html.slice(contentEnd).match(/^<\/li\s*>/i);
    if (!closeMatch) {
      result += html.slice(contentEnd);
      break;
    }
    result += closeMatch[0];
    i = contentEnd + closeMatch[0].length;
  }

  return result;
}

/** Prepare CMS HTML for case prose / caption listing reveal. */
export function prepareCaseProseHtml(html: string): string {
  return wrapCaseListItemBodies(demoteCmsH1(html));
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

/**
 * Strip a single outer `<p>…</p>` so WP WYSIWYG HTML is safe inside a block host
 * (avoids nested `<p>` hydration mismatches). Leaves multi-block markup alone.
 */
export function unwrapOuterParagraph(html: string): string {
  const trimmed = html.trim();
  const match = trimmed.match(/^<p\b[^>]*>([\s\S]*)<\/p>$/i);
  if (!match) return trimmed;
  const inner = match[1] ?? '';
  if (/<p\b/i.test(inner)) return trimmed;
  return inner.trim();
}
