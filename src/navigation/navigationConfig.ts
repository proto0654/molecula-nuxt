export type NavigationItem = {
  id: string;
  label: string;
  atomId: string;
  route?: string;
  /** One-line techno blurb shown under the atom title on commit. */
  blurb: string;
};

export type NavigationConfig = {
  items: NavigationItem[];
};

export const navigationConfig: NavigationConfig = {
  items: [
    {
      id: 'home',
      label: 'Home',
      atomId: 'C',
      route: '/',
      blurb: 'origin node / carbon core',
    },
    {
      id: 'about',
      label: 'About',
      atomId: 'H1',
      route: '/about',
      blurb: 'identity / who we are',
    },
    {
      id: 'services',
      label: 'Services',
      atomId: 'H2',
      route: '/services',
      blurb: 'capabilities / what we ship',
    },
    {
      id: 'work',
      label: 'Work',
      atomId: 'H3',
      route: '/work',
      blurb: 'selected signals / archive',
    },
    {
      id: 'contact',
      label: 'Contact',
      atomId: 'H4',
      route: '/contact',
      blurb: 'open channel / handshake',
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
