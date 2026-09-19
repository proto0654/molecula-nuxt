const NBSP = '\u00A0';

/**
 * Short RU/EN particles that should not sit alone at a line end.
 * Longest alternatives first so `an` / `the` / `and` win over single letters.
 */
const SHORT_WORDS =
  'the|and|for|an|as|at|by|in|is|of|on|or|to|a|' +
  'до|из|ко|на|не|ни|но|об|от|по|со|то|за|во|бы|же|ли|да|ну|' +
  'а|в|и|к|о|с|у|я';

/** Leading boundary is lookbehind so adjacent shorts (`of the`) glue in one pass. */
const ORPHAN_RE = new RegExp(`(?<=^|[\\s${NBSP}])(${SHORT_WORDS}) +`, 'gi');

/**
 * Glue short prepositions/particles to the following word with a non-breaking space.
 * Idempotent for already-glued `\u00A0`.
 */
export function fixOrphanPrepositions(text: string): string {
  if (!text) return text;
  return text.replace(ORPHAN_RE, `$1${NBSP}`);
}
