/** Structural mapping — not CMS content. */
export const NAV_STRUCTURE = [
  { id: 'home', atomId: 'C', route: '/' },
  { id: 'about', atomId: 'H1', route: '/about' },
  { id: 'services', atomId: 'H2', route: '/services' },
  { id: 'work', atomId: 'H3', route: '/portfolio' },
  { id: 'contact', atomId: 'H4', route: '/contact' },
] as const;

export type NavStructureId = (typeof NAV_STRUCTURE)[number]['id'];
