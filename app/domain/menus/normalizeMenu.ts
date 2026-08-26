import type { MenusV1Menu, MenusV1MenuItem } from '~/types/wp';
import type { NavigationMenu, NavigationMenuItem } from '~/types/wp';

function normalizeMenuItem(item: MenusV1MenuItem): NavigationMenuItem {
  const parentRaw = item.menu_item_parent;
  const parentId = parentRaw && parentRaw !== '0' ? Number.parseInt(parentRaw, 10) : 0;
  return {
    id: item.ID,
    title: item.title || '',
    url: item.url || '',
    slug: item.slug ?? null,
    order: item.menu_order ?? 0,
    parentId: Number.isFinite(parentId) ? parentId : 0,
    classes: Array.isArray(item.classes) ? item.classes.filter(Boolean) : [],
    object: item.object || '',
    type: item.type || '',
  };
}

export function normalizeMenu(menu: MenusV1Menu): NavigationMenu {
  const items = (menu.items ?? [])
    .map(normalizeMenuItem)
    .sort((a, b) => a.order - b.order);

  return {
    id: menu.term_id,
    slug: menu.slug,
    name: menu.name,
    count: menu.count,
    items,
  };
}
