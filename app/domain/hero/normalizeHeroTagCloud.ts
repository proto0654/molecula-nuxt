import type { HeroTag, HeroTagCloudRow, ThemeOptionsAcf } from '~/types/wp';
import { emptyToNull } from '~/domain/wp';

function normalizeTier(raw: string | false | undefined): HeroTag['tier'] {
  return raw === 'primary' ? 'primary' : 'secondary';
}

function normalizeTagRow(row: HeroTagCloudRow): HeroTag | null {
  const label = emptyToNull(row.label);
  if (!label) return null;
  return {
    label,
    tier: normalizeTier(row.tier),
  };
}

/**
 * Raw ACF options → hero tag cloud. Empty / false repeater → [].
 * Rows without a label are dropped; unknown tier → secondary.
 */
export function normalizeHeroTagCloud(
  acf: ThemeOptionsAcf | undefined,
): HeroTag[] {
  const rows = acf?.hero_tag_cloud;
  if (!rows || rows === false || !Array.isArray(rows)) return [];
  const tags: HeroTag[] = [];
  for (const row of rows) {
    const tag = normalizeTagRow(row);
    if (tag) tags.push(tag);
  }
  return tags;
}
