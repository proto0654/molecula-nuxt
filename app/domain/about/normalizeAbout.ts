import type { WpPage, AboutAcf } from '~/types/wp';
import type { AboutPage, AboutSkill } from '~/types/wp';
import {
  emptyToNull,
  stripHtmlToPlain,
  normalizeAcfImage,
  embeddedTagNames,
} from '~/domain/wp';

function isAboutAcf(acf: WpPage['acf']): acf is AboutAcf {
  return Boolean(acf) && typeof acf === 'object';
}

function normalizeSkills(acf: AboutAcf): AboutSkill[] {
  const repeater = acf['about-repeater'];
  if (!repeater || repeater === false || !Array.isArray(repeater)) return [];

  const skills: AboutSkill[] = [];
  for (const row of repeater) {
    const title = emptyToNull(row.cf_title);
    const textHtml = emptyToNull(row.cf_text);
    if (!title && !textHtml) continue;
    skills.push({ title, textHtml });
  }
  return skills;
}

/**
 * Raw WP about page → AboutPage. RU only.
 * Empty repeater stays [] (no PHP demo-skill fallback).
 */
export function normalizeAboutPage(page: WpPage): AboutPage {
  const acf: AboutAcf = isAboutAcf(page.acf) ? page.acf : {};

  return {
    id: page.id,
    slug: page.slug,
    title: emptyToNull(page.title?.rendered) ?? page.slug,
    contentHtml: emptyToNull(page.content?.rendered),
    photo: normalizeAcfImage(acf.about_photo),
    tags: embeddedTagNames(page._embedded?.['wp:term']),
    sectionTitle: emptyToNull(acf.about_section_title),
    skills: normalizeSkills(acf),
    ctaLabel: emptyToNull(acf.about_cta_label),
  };
}

export function aboutExcerptPlain(page: AboutPage): string | null {
  return stripHtmlToPlain(page.contentHtml);
}
