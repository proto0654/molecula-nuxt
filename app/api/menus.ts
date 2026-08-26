import type { MenusV1Menu, MenusV1MenuSummary, MenusV1Locations } from '~/types/wp';
import { wpFetch } from './client';

export async function getMenus(): Promise<MenusV1MenuSummary[]> {
  return wpFetch<MenusV1MenuSummary[]>('/menus/v1/menus');
}

export async function getMenu(slug: string): Promise<MenusV1Menu | null> {
  try {
    return await wpFetch<MenusV1Menu>(`/menus/v1/menus/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

export async function getMenuLocations(): Promise<MenusV1Locations> {
  return wpFetch<MenusV1Locations>('/menus/v1/locations');
}
