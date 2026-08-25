export interface NavigationConfig {
  /** Atom ids in navigation order. */
  atomOrder: string[];
  loop: boolean;
}

export const navigationConfig: NavigationConfig = {
  atomOrder: ['O', 'H1', 'H2'],
  loop: true,
};
