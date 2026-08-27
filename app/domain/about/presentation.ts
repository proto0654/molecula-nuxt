import type { AboutPage } from '~/types/wp';

export type AboutSectionKey = 'intro' | 'skills' | 'cta';

export type AboutSectionNumbers = {
  intro: number;
  skills: number;
  cta: number;
};

export type AboutComposition = {
  numbers: AboutSectionNumbers;
  sparse: boolean;
};

/**
 * Visible blocks only — absent sections do not leave number gaps.
 * 0 means the body block is not present.
 */
export function getAboutComposition(page: AboutPage): AboutComposition {
  const numbers: AboutSectionNumbers = {
    intro: 0,
    skills: 0,
    cta: 0,
  };

  let n = 1;
  if (page.contentHtml) {
    numbers.intro = n;
    n += 1;
  }
  if (page.skills.length) {
    numbers.skills = n;
    n += 1;
  }
  if (page.ctaLabel) {
    numbers.cta = n;
    n += 1;
  }

  return {
    numbers,
    sparse: numbers.intro === 0 && numbers.skills === 0,
  };
}
