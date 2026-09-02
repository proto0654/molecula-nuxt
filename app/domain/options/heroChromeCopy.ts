import type { UiStrings } from '~/types/wp/uiStrings';

export type HeroChromeCopy = {
  logoAriaLabel: string;
  routesNavAriaLabel: string;
  menuOpenAriaLabel: string;
  menuCloseAriaLabel: string;
  mobileNavAriaLabel: string;
};

const DEFAULTS: HeroChromeCopy = {
  logoAriaLabel: 'WebLaba, на главную',
  routesNavAriaLabel: 'Разделы сайта',
  menuOpenAriaLabel: 'Открыть меню',
  menuCloseAriaLabel: 'Закрыть меню',
  mobileNavAriaLabel: 'Навигация',
};

export function resolveHeroChromeCopy(ui: UiStrings): HeroChromeCopy {
  return {
    logoAriaLabel:
      ui.hero_logo_alt ?? ui.header_home_aria ?? DEFAULTS.logoAriaLabel,
    routesNavAriaLabel: DEFAULTS.routesNavAriaLabel,
    menuOpenAriaLabel: ui.drawer_open_aria ?? DEFAULTS.menuOpenAriaLabel,
    menuCloseAriaLabel: ui.drawer_close_aria ?? DEFAULTS.menuCloseAriaLabel,
    mobileNavAriaLabel: ui.drawer_menu_aria ?? DEFAULTS.mobileNavAriaLabel,
  };
}
