export type NavigationItem = {
  id: string;
  label: string;
  atomId: string;
  route?: string;
};

export type NavigationConfig = {
  items: NavigationItem[];
};

export const navigationConfig: NavigationConfig = {
  items: [
    { id: 'home', label: 'Home', atomId: 'C', route: '/' },
    { id: 'about', label: 'About', atomId: 'H1', route: '/about' },
    { id: 'services', label: 'Services', atomId: 'H2', route: '/services' },
    { id: 'work', label: 'Work', atomId: 'H3', route: '/work' },
    { id: 'contact', label: 'Contact', atomId: 'H4', route: '/contact' },
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
