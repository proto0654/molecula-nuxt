import type { Service } from '~/types/wp';

export type ServiceSectionKey = 'intro' | 'offers' | 'next';

export type ServiceSectionNumbers = {
  intro: number;
  offers: number;
  next: number;
};

export type ServiceComposition = {
  numbers: ServiceSectionNumbers;
  sparse: boolean;
};

/**
 * Visible blocks only — absent sections do not leave number gaps.
 * NEXT is always last. 0 means the body block is not present.
 */
export function getServiceComposition(service: Service): ServiceComposition {
  const numbers: ServiceSectionNumbers = {
    intro: 0,
    offers: 0,
    next: 0,
  };

  let n = 1;
  if (service.contentHtml) {
    numbers.intro = n;
    n += 1;
  }
  if (service.offers.length) {
    numbers.offers = n;
    n += 1;
  }
  numbers.next = n;

  return {
    numbers,
    sparse: numbers.intro === 0 && numbers.offers === 0,
  };
}
