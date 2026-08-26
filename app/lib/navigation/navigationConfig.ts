export type NavigationItem = {
  id: string;
  label: string;
  atomId: string;
  route?: string;
  /** One-line techno blurb shown under the atom title on commit. */
  blurb: string;
  /** Short USP headline in HUD space after focus settles. */
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
      blurb: 'узел истока / углеродное ядро',
      usp: 'Сборка смысла из хаоса',
    },
    {
      id: 'about',
      label: 'О нас',
      atomId: 'H1',
      route: '/about',
      blurb: 'идентичность / кто мы',
      usp: 'Системное мышление в продукте',
    },
    {
      id: 'services',
      label: 'Услуги',
      atomId: 'H2',
      route: '/services',
      blurb: 'возможности / что делаем',
      usp: 'От концепции до релиза',
    },
    {
      id: 'work',
      label: 'Работы',
      atomId: 'H3',
      route: '/portfolio',
      blurb: 'выбранные сигналы / архив',
      usp: 'Сигналы, которые сработали',
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
