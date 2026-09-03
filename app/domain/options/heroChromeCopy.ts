import type { UiStrings } from '~/types/wp/uiStrings';
import { uiOrMissing } from './missingUiString';

export type HeroChromeCopy = {
  logoAriaLabel: string;
  routesNavAriaLabel: string;
  menuOpenAriaLabel: string;
  menuCloseAriaLabel: string;
  mobileNavAriaLabel: string;
  menuOpenLabel: string;
  menuCloseLabel: string;
  navMark: string;
  /** Desktop committed rail CTA («Перейти») */
  navGo: string;
  mobileCloseLabel: string;
  sysMeta: string;
  nodeIdle: string;
  /** Placeholders: `{nn}`, `{label}` */
  nodeFormat: string;
  statusNodeIdle: string;
  /** Placeholder: `{nn}` */
  statusNodeFormat: string;
  statusIdle: string;
  statusReady: string;
  statusActive: string;
  verbClick: string;
  verbTap: string;
};

/** Replace `{name}` tokens in HUD format strings. */
export function formatHudTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');
}

export function resolveHeroChromeCopy(ui: UiStrings): HeroChromeCopy {
  return {
    logoAriaLabel: uiOrMissing(
      ui.hero_logo_alt ?? ui.header_home_aria,
      'hero_logo_alt',
    ),
    // No Options key yet — leave empty rather than invent copy.
    routesNavAriaLabel: '',
    menuOpenAriaLabel: uiOrMissing(ui.drawer_open_aria, 'drawer_open_aria'),
    menuCloseAriaLabel: uiOrMissing(ui.drawer_close_aria, 'drawer_close_aria'),
    mobileNavAriaLabel: uiOrMissing(ui.drawer_menu_aria, 'drawer_menu_aria'),
    menuOpenLabel: uiOrMissing(ui.hud_menu_open, 'hud_menu_open'),
    menuCloseLabel: uiOrMissing(ui.hud_menu_close, 'hud_menu_close'),
    navMark: uiOrMissing(ui.hud_nav_mark, 'hud_nav_mark'),
    navGo: uiOrMissing(ui.hud_nav_go, 'hud_nav_go'),
    mobileCloseLabel: uiOrMissing(ui.hud_mobile_close, 'hud_mobile_close'),
    sysMeta: uiOrMissing(ui.hud_sys_meta, 'hud_sys_meta'),
    nodeIdle: uiOrMissing(ui.hud_node_idle, 'hud_node_idle'),
    nodeFormat: uiOrMissing(ui.hud_node_format, 'hud_node_format'),
    statusNodeIdle: uiOrMissing(ui.hud_status_node_idle, 'hud_status_node_idle'),
    statusNodeFormat: uiOrMissing(
      ui.hud_status_node_format,
      'hud_status_node_format',
    ),
    statusIdle: uiOrMissing(ui.hud_status_idle, 'hud_status_idle'),
    statusReady: uiOrMissing(ui.hud_status_ready, 'hud_status_ready'),
    statusActive: uiOrMissing(ui.hud_status_active, 'hud_status_active'),
    verbClick: uiOrMissing(ui.nav_verb_click, 'nav_verb_click'),
    verbTap: uiOrMissing(ui.nav_verb_tap, 'nav_verb_tap'),
  };
}
