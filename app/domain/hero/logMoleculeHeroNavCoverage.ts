import type { HeroNavItemRow } from '~/types/wp';
import { NAV_STRUCTURE, type NavStructureId } from '~/lib/navigation/navStructure';
import { MOLECULE_PAGE_SLUG_BY_NAV_ID } from '~/lib/navigation/moleculePageSlugs';

type MoleculeHeroField = 'label' | 'usp' | 'blurb' | 'blurbCta';

type MoleculeHeroCoverageRow = {
  navId: NavStructureId;
  pageSlug: string;
  field: MoleculeHeroField;
  wp: 'ok' | 'empty';
  value: string;
};

let loggedOnce = false;

function rowFor(rows: readonly HeroNavItemRow[], navId: string): HeroNavItemRow | undefined {
  return rows.find((row) => row.navId === navId);
}

/** Dev-only: coverage for page-based molecule hero copy (not Theme Options). */
export function logMoleculeHeroNavCoverage(rows: readonly HeroNavItemRow[]): void {
  if (!import.meta.dev || loggedOnce) return;
  loggedOnce = true;

  const table: MoleculeHeroCoverageRow[] = [];
  for (const struct of NAV_STRUCTURE) {
    const pageSlug = MOLECULE_PAGE_SLUG_BY_NAV_ID[struct.id];
    const row = rowFor(rows, struct.id);
    const fields: Array<[MoleculeHeroField, string | null | undefined]> = [
      ['label', row?.label],
      ['usp', row?.usp],
      ['blurb', row?.blurb],
      ['blurbCta', row?.blurbCta],
    ];
    for (const [field, raw] of fields) {
      const value = raw?.trim() || '';
      table.push({
        navId: struct.id,
        pageSlug,
        field,
        wp: value ? 'ok' : 'empty',
        value: value || '(empty)',
      });
    }
  }

  const empty = table.filter((r) => r.wp === 'empty');
  const missingPages = NAV_STRUCTURE.filter((s) => !rowFor(rows, s.id)).map((s) => s.id);

  console.group('[molecule-hero-nav] coverage');
  console.table(table);
  if (missingPages.length) {
    console.warn('Nav nodes with no WP page row (fetch miss):', missingPages);
  }
  if (empty.length) {
    console.info(
      'Empty page hero fields:',
      empty.map((r) => `${r.navId}.${r.field}`),
    );
  }
  if (!rows.length) {
    console.warn('No molecule hero pages returned — check WP API / getMoleculeHeroPages()');
  }
  console.groupEnd();
}

/** Reset for tests / HMR. */
export function resetMoleculeHeroNavCoverageLog(): void {
  loggedOnce = false;
}
