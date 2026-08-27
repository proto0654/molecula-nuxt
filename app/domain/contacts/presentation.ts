import type { ContactPage } from '~/types/wp';

export type ContactSectionNumbers = {
  intro: number;
  links: number;
};

export type ContactComposition = {
  numbers: ContactSectionNumbers;
  sparse: boolean;
};

/**
 * Visible blocks only — absent sections do not leave number gaps.
 * 0 means the body block is not present.
 */
export function getContactComposition(page: ContactPage): ContactComposition {
  const numbers: ContactSectionNumbers = {
    intro: 0,
    links: 0,
  };

  let n = 1;
  if (page.text) {
    numbers.intro = n;
    n += 1;
  }
  if (page.contacts.length) {
    numbers.links = n;
    n += 1;
  }

  return {
    numbers,
    sparse: numbers.intro === 0 && numbers.links === 0,
  };
}
