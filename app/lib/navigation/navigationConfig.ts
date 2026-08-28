export type NavigationItem = {
  id: string;
  /** Nav rail + 3D atom caption. Hardcoded; target: WP main menu title (see docs/CONTENT.md). */
  label: string;
  atomId: string;
  route?: string;
  /** One-line techno blurb shown under the atom title on commit. Hardcoded; target: WP hero_blurb. */
  blurb: string;
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
      blurb: 'студия weblaba / клик — о нас',
      usp: 'Команда, процесс, подход',
    },
    {
      id: 'services',
      label: 'Услуги',
      atomId: 'H2',
      route: '/services',
      blurb: 'разработка и дизайн / клик — услуги',
      usp: 'От идеи до релиза',
    },
    {
      id: 'work',
      label: 'Портфолио',
      atomId: 'H3',
      route: '/portfolio',
      blurb: 'архив проектов / клик — портфолио',
      usp: 'Кейсы, которые работают',
    },
    {
      id: 'contact',
      label: 'Контакты',
      atomId: 'H4',
      route: '/contact',
      blurb: 'открытый канал / рукопожатие',
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
