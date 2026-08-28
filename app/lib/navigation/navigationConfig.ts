export type NavigationItem = {
  id: string;
  /** Nav rail + 3D atom caption. Hardcoded; target: WP main menu title (see docs/CONTENT.md). */
  label: string;
  atomId: string;
  route?: string;
  /** Descriptive blurb (part 1). Navigable atoms get a dynamic click/tap CTA appended at runtime. */
  blurb: string;
  /** CTA tail glued to «кликай/тапай» — leading space or punctuation included, e.g. « для связи со мной», «, будем знакомиться». */
  blurbCta?: string;
  /** Short USP headline in HUD space after focus settles. Hardcoded; target: WP hero_usp. */
  usp: string;
};

export type NavigationConfig = {
  items: NavigationItem[];
};

export const navigationConfig: NavigationConfig = {
  items: [
    {
      id: 'home',
      label: 'Главная',
      atomId: 'C',
      route: '/',
      blurb: 'weblaba / студия веб-продуктов',
      usp: 'Цифровые продукты из одного узла',
    },
    {
      id: 'about',
      label: 'О нас',
      atomId: 'H1',
      route: '/about',
      blurb: 'студия weblaba',
      blurbCta: ', будем знакомится',
      usp: 'Команда, процесс, подход',
    },
    {
      id: 'services',
      label: 'Услуги',
      atomId: 'H2',
      route: '/services',
      blurb: 'разработка и дизайн',
      blurbCta: ', чтобы выбрать услуги',
      usp: 'От идеи до релиза',
    },
    {
      id: 'work',
      label: 'Портфолио',
      atomId: 'H3',
      route: '/portfolio',
      blurb: 'архив проектов',
      blurbCta: ', переход в портфолио',
      usp: 'Кейсы, которые работают',
    },
    {
      id: 'contact',
      label: 'Контакты',
      atomId: 'H4',
      route: '/contact',
      blurb: 'открытый канал',
      blurbCta: ' для связи со мной',
      usp: 'Прямой канал без шума',
    },
  ],
};

const itemsById = new Map(
  navigationConfig.items.map((item) => [item.id, item]),
);

const itemsByAtomId = new Map(
  navigationConfig.items.map((item) => [item.atomId, item]),
);

export function getItemById(id: string): NavigationItem | undefined {
  return itemsById.get(id);
}

export function getItemByAtomId(atomId: string): NavigationItem | undefined {
  return itemsByAtomId.get(atomId);
}
