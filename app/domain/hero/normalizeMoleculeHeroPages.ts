import type { HeroNavItemRow, MoleculeHeroPageAcf, WpPage } from '~/types/wp';
import type { SiteLocale } from '~/domain/i18n';
import { pickLocalized } from '~/domain/i18n';
import { resolveEnTitle } from '~/domain/i18n';
import { emptyToNull, htmlToPlainText } from '~/domain/wp';
import { navIdForMoleculeSlug } from '~/lib/navigation/moleculePageSlugs';

function asMoleculeAcf(
  acf: WpPage['acf'],
): MoleculeHeroPageAcf | undefined {
  if (!acf || typeof acf !== 'object') return undefined;
  return acf as MoleculeHeroPageAcf & {
    post_title_en?: string | null;
  };
}

/** Map WP navigation pages → hero nav rows. */
export function normalizeMoleculeHeroPages(
  pages: readonly WpPage[],
  locale: SiteLocale = 'ru',
): HeroNavItemRow[] {
  const rows: HeroNavItemRow[] = [];
  for (const page of pages) {
    const navId = navIdForMoleculeSlug(page.slug);
    if (!navId) continue;
    const acf = asMoleculeAcf(page.acf);
    const ruTitle = page.title?.rendered
      ? htmlToPlainText(page.title.rendered)
      : '';
    const enTitleRaw = resolveEnTitle(page.meta, acf);

    rows.push({
      navId,
      label: pickLocalized(locale, emptyToNull(ruTitle), enTitleRaw),
      blurb: pickLocalized(
        locale,
        emptyToNull(acf?.hero_blurb),
        emptyToNull(acf?.hero_blurb_en),
      ),
      blurbCta: pickLocalized(
        locale,
        emptyToNull(acf?.hero_blurb_cta),
        emptyToNull(acf?.hero_blurb_cta_en),
      ),
      usp: pickLocalized(
        locale,
        emptyToNull(acf?.hero_usp),
        emptyToNull(acf?.hero_usp_en),
      ),
    });
  }
  return rows;
}
