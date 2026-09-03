import type { WpPage, AboutAcf } from '~/types/wp';
import type { AboutPage, AboutSkill } from '~/types/wp';
import type { SiteLocale } from '~/domain/i18n';
import { pickLocalized } from '~/domain/i18n';
import { localizedRenderedTitle, resolveEnContent } from '~/domain/i18n';
import {
  emptyToNull,
  stripHtmlToPlain,
  normalizeAcfImage,
  embeddedTagNames,
} from '~/domain/wp';

function isAboutAcf(acf: WpPage['acf']): acf is AboutAcf {
  return Boolean(acf) && typeof acf === 'object';
}

function normalizeSkills(acf: AboutAcf, locale: SiteLocale): AboutSkill[] {
  const useEn =
    locale === 'en' &&
    acf['about-repeater_en'] &&
    acf['about-repeater_en'] !== false &&
    Array.isArray(acf['about-repeater_en']) &&
    acf['about-repeater_en'].length > 0;

  const repeater = useEn ? acf['about-repeater_en']! : acf['about-repeater'];
  if (!repeater || repeater === false || !Array.isArray(repeater)) return [];

  const skills: AboutSkill[] = [];
  for (const row of repeater) {
    const title = emptyToNull(
      useEn ? (row as { cf_title_en?: string }).cf_title_en : (row as { cf_title?: string }).cf_title,
    );
    const textHtml = emptyToNull(
      useEn ? (row as { cf_text_en?: string }).cf_text_en : (row as { cf_text?: string }).cf_text,
    );
    if (!title && !textHtml) continue;
    skills.push({ title, textHtml });
  }
  return skills;
}

/**
 * Raw WP about page → AboutPage.
 * Empty repeater stays [] (no PHP demo-skill fallback).
 */
export function normalizeAboutPage(
  page: WpPage,
  locale: SiteLocale = 'ru',
): AboutPage {
  const acf: AboutAcf = isAboutAcf(page.acf) ? page.acf : {};
  const ruContent = emptyToNull(page.content?.rendered);
  const enContent = resolveEnContent(page.meta, acf);

  return {
    id: page.id,
    slug: page.slug,
    title: localizedRenderedTitle(
      locale,
      page.title?.rendered,
      page.slug,
      page.meta,
      acf,
    ),
    contentHtml: pickLocalized(locale, ruContent, enContent),
    photo: normalizeAcfImage(acf.about_photo),
    tags: embeddedTagNames(page._embedded?.['wp:term']),
    sectionTitle: pickLocalized(
      locale,
      emptyToNull(acf.about_section_title),
      emptyToNull(acf.about_section_title_en),
    ),
    skills: normalizeSkills(acf, locale),
    ctaLabel: pickLocalized(
      locale,
      emptyToNull(acf.about_cta_label),
      emptyToNull(acf.about_cta_label_en),
    ),
  };
}

export function aboutExcerptPlain(page: AboutPage): string | null {
  return stripHtmlToPlain(page.contentHtml);
}
