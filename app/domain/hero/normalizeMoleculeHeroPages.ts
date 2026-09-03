import type { HeroNavItemRow, MoleculeHeroPageAcf, WpPage } from '~/types/wp';
import { emptyToNull, htmlToPlainText } from '~/domain/wp';
import { navIdForMoleculeSlug } from '~/lib/navigation/moleculePageSlugs';

function asMoleculeAcf(
  acf: WpPage['acf'],
): MoleculeHeroPageAcf | undefined {
  if (!acf || typeof acf !== 'object') return undefined;
  return acf as MoleculeHeroPageAcf;
}

/** Map WP navigation pages → hero nav rows (RU). */
export function normalizeMoleculeHeroPages(
  pages: readonly WpPage[],
): HeroNavItemRow[] {
  const rows: HeroNavItemRow[] = [];
  for (const page of pages) {
    const navId = navIdForMoleculeSlug(page.slug);
    if (!navId) continue;
    const acf = asMoleculeAcf(page.acf);
    const title = page.title?.rendered
      ? htmlToPlainText(page.title.rendered)
      : '';
    rows.push({
      navId,
      label: emptyToNull(title),
      blurb: emptyToNull(acf?.hero_blurb),
      blurbCta: emptyToNull(acf?.hero_blurb_cta),
      usp: emptyToNull(acf?.hero_usp),
    });
  }
  return rows;
}
