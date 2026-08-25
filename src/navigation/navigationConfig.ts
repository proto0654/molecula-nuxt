export interface NavigationConfig {
  /** Atom ids in navigation order. */
  atomOrder: string[];
  loop: boolean;
}

export const navigationConfig: NavigationConfig = {
  atomOrder: ['C', 'H1', 'H2', 'H3', 'H4'],
  loop: true,
};
